import * as Excel from 'exceljs';
import { prompt } from 'enquirer';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';

interface GenerateParams {
  year?: number;
  month?: number;
  output?: string;
  separator?: boolean;
  skipZero?: boolean;
  force?: boolean;
}

export default class {
  private workbook: Excel.Workbook;
  private worksheet: Excel.Worksheet;
  private prisma: PrismaClient;
  private columns: Record<'date' | 'amount', string>;

  constructor(columns?: Record<'date' | 'amount', string>) {
    this.workbook = new Excel.Workbook();
    this.worksheet = this.workbook.addWorksheet();
    this.prisma = new PrismaClient();
    this.columns = columns || { date: '날짜', amount: '판매 금액' };
  }

  *processGenerator(
    target: string,
    skipZero: boolean,
    separator: boolean
  ): Generator<() => void> {
    let startTime: number;
    let endTime: number;

    yield () => {
      startTime = performance.now();
      console.log(`target:    ${target}`);
      console.log(`skip zero: ${skipZero}`);
      console.log(`separator: ${separator}`);
    };

    yield () => {
      endTime = performance.now();
      console.log(
        `\nDone In: ${((endTime - startTime) / 1000).toFixed(2)}s ✨`
      );
    };
  }

  private initializeWorksheet(separator: boolean): void {
    this.worksheet.columns = [
      { header: this.columns.date, key: 'date', width: 12 },
      {
        header: this.columns.amount,
        key: 'amount',
        width: 12,
        style: separator ? { numFmt: '#,##0' } : undefined,
      },
    ];
  }

  private async sumOfDateAmount(
    year: number,
    month: number,
    date: number
  ): Promise<number> {
    try {
      let sum: number = 0;

      const totalPrice = await this.prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: new Date(year, month - 1, date),
            lt: new Date(year, month - 1, date + 1),
          },
        },
        select: { totalPrice: true },
      });

      for (const { totalPrice: price } of totalPrice) {
        sum += price;
      }

      return sum;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  private async saveFile(force: boolean, outputPath: string): Promise<void> {
    try {
      if (!force && existsSync(outputPath)) {
        const { overwrite } = await prompt<{ overwrite: string }>({
          type: 'input',
          name: 'overwrite',
          message: 'file already exists. Save anyway? (y/n)',
          initial: 'y',
        });

        if (!/^(?:y|yes|true|1|on)$/i.test(overwrite)) {
          console.log('save canceled');
          process.exit(0);
        }
      }

      await this.workbook.xlsx.writeFile(outputPath);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  public async generateByMonth({
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    separator = true,
    skipZero = false,
    force = false,
    output = `${year}-${month} sales amount.xlsx`,
  }: GenerateParams): Promise<void> {
    try {
      this.initializeWorksheet(separator);
      const process = this.processGenerator(
        `${year}-${month}`,
        skipZero,
        separator
      );

      process.next().value();

      const lastDate = new Date(year, month, 0);
      for (let date = 1; date <= lastDate.getDate(); date++) {
        const sum = await this.sumOfDateAmount(year, month, date);

        if (sum === 0 && skipZero) continue;

        this.worksheet.addRow({
          date: `${year}-${month}-${date}`,
          amount: sum,
        });
      }

      await this.saveFile(force, output);

      process.next().value();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  public async generateAll({
    separator = true,
    skipZero = false,
    force = false,
    output = 'sales amount.xlsx',
  }: GenerateParams): Promise<void> {
    this.initializeWorksheet(separator);
    const process = this.processGenerator('all', skipZero, separator);
    process.next().value();

    const { createdAt: firstDay } = (
      await this.prisma.transaction.findMany({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
        take: 1,
      })
    )[0];

    for (let d = firstDay; d <= new Date(); d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const date = d.getDate();

      const sum = await this.sumOfDateAmount(year, month, date);

      if (sum === 0 && skipZero) continue;

      this.worksheet.addRow({
        date: `${year}-${month}-${date}`,
        amount: sum,
      });
    }

    await this.saveFile(force, output);
    process.next().value();
  }
}
