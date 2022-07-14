import Generator from '.';
import { Command } from 'commander';
const program = new Command();

program
  .option('-y, --year <number>', 'target year (default: current year)')
  .option('-m, --month <number>', 'target month (default: current month)')
  .option('-o, --output <string>')
  .option('--no-separator', 'separate amount with comma')
  .option('-f, --force', 'overwrite output file (default: false)')
  .option('--skip-zero', 'skip zero amount (default: false)');

program.parse();

const options = program.opts();

async function generateFile() {
  const generator = new Generator();

  console.log(options);

  await generator.generate({
    year: options.year,
    month: options.month,
    output: options.output,
    separator: options.separator,
    skipZero: options.skipZero,
    force: options.force,
  });
}

generateFile();
