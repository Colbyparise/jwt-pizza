import { createServer } from 'vite';
import { createInstrumenter } from 'istanbul-lib-instrument';

const instrumentation = {
  name: 'playwright-coverage-instrumentation',
  enforce: 'post',
  transform(code, id, options) {
    if (!id.includes('/src/') && !id.includes('\\src\\')) return null;

    const instrumenter = createInstrumenter({
      esModules: true,
      compact: false,
      produceSourceMap: true,
    });
    const source = id.split('?')[0];
    const instrumented = instrumenter.instrumentSync(code, source, options?.map);
    return { code: instrumented, map: instrumenter.lastSourceMap() };
  },
};

const server = await createServer({
  configFile: false,
  plugins: [instrumentation],
  server: { host: '127.0.0.1' },
});

await server.listen();
server.printUrls();
