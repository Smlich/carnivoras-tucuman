export async function startTestServer(app, context) {
  const server = app.listen(0, '127.0.0.1');

  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  return `http://127.0.0.1:${server.address().port}`;
}
