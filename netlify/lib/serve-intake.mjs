// Translate Netlify's current Request API into the shared intake handler input.
export async function intakeResponse(request, context, handle) {
  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    body: request.method === 'POST' ? await request.text() : undefined
  };
  const result = await handle(event, context);
  return new Response(result.body, {status: result.statusCode, headers: result.headers});
}
