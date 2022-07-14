import Generator from '.';
import { Command } from 'commander';

const program = new Command();
const generator = new Generator();

program
  .command('month')
  .option('-y, --year <number>', 'target year (default: current year)')
  .option('-m, --month <number>', 'target month (default: current month)')
  .option('-o, --output <string>')
  .option('--no-separator', 'separate amount with comma')
  .option('-f, --force', 'overwrite output file')
  .option('--skip-zero', 'skip zero amount')
  .action(async (options) => await generator.generateByMonth({ ...options }));

program
  .command('all')
  .option('-o, --output <string>')
  .option('--no-separator', 'separate amount with comma')
  .option('-f, --force', 'overwrite output file')
  .option('--skip-zero', 'skip zero amount')
  .action(async (options) => await generator.generateAll({ ...options }));

program.parse();
