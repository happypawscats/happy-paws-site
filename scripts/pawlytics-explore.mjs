#!/usr/bin/env node
// Logs in to Pawlytics and saves the shape of its GraphQL API (the schema), so the field mapping can
// be written. It reads no pets and no personal data. Run it on your own computer:
//   node --env-file=.env scripts/pawlytics-explore.mjs
// It writes two files, both safe to share: pawlytics-schema.json (everything) and
// pawlytics-schema-summary.txt (a short readable version). Neither holds a password or a token.
import { writeFile } from 'node:fs/promises';
import { graphqlClient, login, settingsFromEnv } from './lib/pawlytics.mjs';

const INTROSPECTION = `query Introspect {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      kind name description
      fields { name description args { name type { ...TypeRef } } type { ...TypeRef } }
      inputFields { name type { ...TypeRef } }
      enumValues { name }
    }
  }
}
fragment TypeRef on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }`;

const typeName = (t) => (!t ? '?' : t.kind === 'NON_NULL' ? `${typeName(t.ofType)}!` : t.kind === 'LIST' ? `[${typeName(t.ofType)}]` : t.name);

async function main() {
  const token = await login(settingsFromEnv());
  const data = await graphqlClient({ token })(INTROSPECTION);
  const schema = data.__schema;
  await writeFile('pawlytics-schema.json', JSON.stringify(schema, null, 2));

  const byName = new Map(schema.types.map((t) => [t.name, t]));
  const lines = [];
  const root = byName.get(schema.queryType.name);
  lines.push(`QUERIES (${root.fields.length})`);
  for (const f of root.fields) {
    const args = f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(', ');
    lines.push(`  ${f.name}(${args}) -> ${typeName(f.type)}`);
  }
  const interesting = /pet|animal|foster|location|tag|photo|image|media|status|species|breed|colou?r|behaviou?r|adopt|custom/i;
  lines.push('', 'TYPES THAT MAY MATTER');
  for (const t of schema.types) {
    if (t.name.startsWith('__') || !interesting.test(t.name)) continue;
    if (t.kind === 'ENUM') lines.push(`  enum ${t.name}: ${t.enumValues.map((v) => v.name).join(', ')}`);
    else if (t.fields) lines.push(`  type ${t.name}: ${t.fields.map((f) => `${f.name}: ${typeName(f.type)}`).join(', ')}`);
    else if (t.inputFields) lines.push(`  input ${t.name}: ${t.inputFields.map((f) => `${f.name}: ${typeName(f.type)}`).join(', ')}`);
  }
  await writeFile('pawlytics-schema-summary.txt', `${lines.join('\n')}\n`);
  console.log(`Saved pawlytics-schema.json and pawlytics-schema-summary.txt (${schema.types.length} types, ${root.fields.length} queries).`);
}

main().catch((err) => { console.error(`Explorer stopped: ${err.message}`); process.exit(1); });
