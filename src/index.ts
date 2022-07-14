import * as Excel from 'exceljs';
import { prompt } from 'enquirer';
import { existsSync } from 'fs';
import prisma from './libs/prisma';

import type { GenerateParams } from './types';

export default class {
  private workbook: Excel.Workbook;
  private worksheet: Excel.Worksheet;

  constructor() {
    this.workbook = new Excel.Workbook();
    this.worksheet = this.workbook.addWorksheet();
  }

  private async sumOfDateAmount(
    year: number,
    month: number,
    date: number
  ): Promise<number> {
    try {
      let sum: number = 0;

      const totalPrice = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: new Date(year, month, date),
            lt: new Date(year, month, date + 1),
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

  public async generate({
    year = new Date().getFullYear(),
    month = new Date().getMonth(),
    separator = true,
    skipZero = false,
    force = false,
    output,
  }: GenerateParams): Promise<void> {
    try {
      this.worksheet.columns = [
        { header: '날짜', key: 'date', width: 12 },
        {
          header: '판매 금액',
          key: 'amount',
          width: 12,
          style: separator ? { numFmt: '#,##0' } : undefined,
        },
      ];

      const startTime = performance.now();
      const outputPath = output || `${year}-${month} sales amount.xlsx`;

      console.log(`target:    ${year}-${month}`);
      console.log(`output:    ${outputPath}`);
      console.log(`skip zero: ${skipZero}`);
      console.log(`separator: ${separator}`);

      const lastDate = new Date(year, month, 0);

      for (let date = 1; date <= lastDate.getDate(); date++) {
        const sum = await this.sumOfDateAmount(year, month - 1, date);
        if (sum === 0 && skipZero) continue;
        this.worksheet.addRow({
          date: `${year}-${month}-${date}`,
          amount: sum,
        });
      }

      await this.saveFile(force, outputPath);

      const endTime = performance.now();
      console.log(
        `\nDone In: ${((endTime - startTime) / 1000).toFixed(2)}s ✨`
      );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
