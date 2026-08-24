const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const imageUrl = body?.image_url;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json({ error: 'image_url krävs' }, { status: 400 });
    }

    const prompt = `Du är en noggrann kvittoanalysator för svenska (och nordiska) kvitton. Titta noga på bilden och avgör om det är ett riktigt, komplett och läsbart kvitto.

Kontrollera:
- Om bilden faktiskt föreställer ett kvitto (inte en slumpmässig bild, ett foto av något annat, en skärmdump av chatt etc.)
- Om texten är tillräckligt tydlig för att kunna läsas
- Om kvittot verkar komplett (butik, datum, produkter och total syns rimligtvis)
- Identifiera butik/utfärdare, datum, tid, produkter med namn, vikt/mängd om det finns, pris per rad och totalbelopp.

Var strikt: om bilden INTE är ett giltigt kvitto, sätt is_valid_receipt till false och ge en tydlig svensk förklaring i rejection_reason.

Svara ENBART med JSON enligt schemat. Hitta aldrig på data som inte syns i bilden. Om ett fält inte går att utläsa, lämna det tomt eller null.`;

    const result = await db.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [imageUrl],
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          is_valid_receipt: { type: 'boolean' },
          confidence: { type: 'number' },
          rejection_reason: { type: 'string' },
          store: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          currency: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                weight: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' }
              }
            }
          },
          total: { type: 'number' },
          raw_text: { type: 'string' }
        },
        required: ['is_valid_receipt']
      }
    });

    if (!result || typeof result.is_valid_receipt === 'undefined') {
      return Response.json(
        { technical_error: true, message: 'Kunde inte tolka svaret från kvittoanalysen. Försök igen senare.' },
        { status: 502 }
      );
    }
    return Response.json(result);
  } catch (error) {
    // Tekniskt fel (API-fel, rate limit, integrationsgräns mm) – ALDRIG samma som ett ogiltigt kvitto.
    return Response.json(
      { technical_error: true, message: 'Ett tekniskt fel gjorde att vi inte kunde analysera kvittot. Försök igen senare.' },
      { status: 500 }
    );
  }
}