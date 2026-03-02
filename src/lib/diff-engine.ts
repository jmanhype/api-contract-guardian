/**
 * OpenAPI Spec Diff Engine
 * Detects breaking changes between two OpenAPI/Swagger specs.
 */

export interface Change {
  severity: "breaking" | "warning" | "info";
  changeType: string;
  path: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}

interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, PathItem>>;
  components?: { schemas?: Record<string, SchemaObject> };
  definitions?: Record<string, SchemaObject>; // Swagger 2.0
}

interface PathItem {
  summary?: string;
  parameters?: Parameter[];
  requestBody?: { required?: boolean; content?: Record<string, { schema?: SchemaObject }> };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: SchemaObject }> }>;
}

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: SchemaObject;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  $ref?: string;
  enum?: string[];
}

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export function diffSpecs(oldSpec: OpenAPISpec, newSpec: OpenAPISpec): Change[] {
  const changes: Change[] = [];
  const oldPaths = oldSpec.paths || {};
  const newPaths = newSpec.paths || {};

  // 1. Check for removed endpoints
  for (const [path, methods] of Object.entries(oldPaths)) {
    if (!newPaths[path]) {
      for (const method of Object.keys(methods)) {
        if (!METHODS.includes(method.toLowerCase())) continue;
        changes.push({
          severity: "breaking",
          changeType: "endpoint_removed",
          path: `${method.toUpperCase()} ${path}`,
          description: `Endpoint removed: ${method.toUpperCase()} ${path}`,
        });
      }
      continue;
    }

    for (const method of Object.keys(methods)) {
      if (!METHODS.includes(method.toLowerCase())) continue;
      const oldOp = methods[method];
      const newOp = newPaths[path]?.[method];

      if (!newOp) {
        changes.push({
          severity: "breaking",
          changeType: "endpoint_removed",
          path: `${method.toUpperCase()} ${path}`,
          description: `Method removed: ${method.toUpperCase()} ${path}`,
        });
        continue;
      }

      // 2. Check parameters
      const oldParams = (oldOp.parameters || []) as Parameter[];
      const newParams = (newOp.parameters || []) as Parameter[];

      // New required parameters = breaking
      for (const np of newParams) {
        const op = oldParams.find(
          (p) => p.name === np.name && p.in === np.in
        );
        if (!op && np.required) {
          changes.push({
            severity: "breaking",
            changeType: "field_required",
            path: `${method.toUpperCase()} ${path} param:${np.name}`,
            description: `New required parameter added: ${np.name} (${np.in})`,
            newValue: JSON.stringify(np),
          });
        } else if (!op && !np.required) {
          changes.push({
            severity: "info",
            changeType: "field_added",
            path: `${method.toUpperCase()} ${path} param:${np.name}`,
            description: `New optional parameter: ${np.name} (${np.in})`,
          });
        }
      }

      // Removed parameters
      for (const op of oldParams) {
        const np = newParams.find(
          (p) => p.name === op.name && p.in === op.in
        );
        if (!np) {
          changes.push({
            severity: "warning",
            changeType: "param_removed",
            path: `${method.toUpperCase()} ${path} param:${op.name}`,
            description: `Parameter removed: ${op.name} (${op.in})`,
            oldValue: JSON.stringify(op),
          });
        }
      }

      // Parameter became required
      for (const np of newParams) {
        const op = oldParams.find(
          (p) => p.name === np.name && p.in === np.in
        );
        if (op && !op.required && np.required) {
          changes.push({
            severity: "breaking",
            changeType: "field_required",
            path: `${method.toUpperCase()} ${path} param:${np.name}`,
            description: `Parameter became required: ${np.name}`,
            oldValue: "optional",
            newValue: "required",
          });
        }
      }

      // Type changes in parameters
      for (const np of newParams) {
        const op = oldParams.find(
          (p) => p.name === np.name && p.in === np.in
        );
        if (op && op.schema?.type && np.schema?.type && op.schema.type !== np.schema.type) {
          changes.push({
            severity: "breaking",
            changeType: "type_changed",
            path: `${method.toUpperCase()} ${path} param:${np.name}`,
            description: `Parameter type changed: ${np.name} (${op.schema.type} → ${np.schema.type})`,
            oldValue: op.schema.type,
            newValue: np.schema.type,
          });
        }
      }

      // 3. Check request body — new required fields
      diffRequestBody(oldOp, newOp, method, path, changes);

      // 4. Check response schema changes
      diffResponses(oldOp, newOp, method, path, changes);
    }
  }

  // 5. New endpoints (info)
  for (const [path, methods] of Object.entries(newPaths)) {
    if (!oldPaths[path]) {
      for (const method of Object.keys(methods)) {
        if (!METHODS.includes(method.toLowerCase())) continue;
        changes.push({
          severity: "info",
          changeType: "endpoint_added",
          path: `${method.toUpperCase()} ${path}`,
          description: `New endpoint: ${method.toUpperCase()} ${path}`,
        });
      }
    }
  }

  // 6. Schema-level changes
  diffSchemas(oldSpec, newSpec, changes);

  return changes;
}

function diffRequestBody(
  oldOp: PathItem,
  newOp: PathItem,
  method: string,
  path: string,
  changes: Change[]
) {
  const oldBody = oldOp.requestBody;
  const newBody = newOp.requestBody;

  if (!oldBody && newBody?.required) {
    changes.push({
      severity: "breaking",
      changeType: "field_required",
      path: `${method.toUpperCase()} ${path} requestBody`,
      description: "Request body is now required (was absent before)",
    });
  }

  // Check for new required fields in JSON body schema
  const oldSchema = getJsonSchema(oldBody);
  const newSchema = getJsonSchema(newBody);
  if (oldSchema && newSchema) {
    const oldRequired = new Set(oldSchema.required || []);
    const newRequired = new Set(newSchema.required || []);
    for (const field of newRequired) {
      if (!oldRequired.has(field) && !oldSchema.properties?.[field]) {
        changes.push({
          severity: "breaking",
          changeType: "field_required",
          path: `${method.toUpperCase()} ${path} body.${field}`,
          description: `New required body field: ${field}`,
        });
      }
    }
  }
}

function diffResponses(
  oldOp: PathItem,
  newOp: PathItem,
  method: string,
  path: string,
  changes: Change[]
) {
  const oldResponses = oldOp.responses || {};
  const newResponses = newOp.responses || {};

  for (const [code, oldResp] of Object.entries(oldResponses)) {
    const newResp = newResponses[code];
    if (!newResp) {
      changes.push({
        severity: "warning",
        changeType: "response_removed",
        path: `${method.toUpperCase()} ${path} response:${code}`,
        description: `Response ${code} removed`,
      });
      continue;
    }

    const oldSchema = getJsonSchema(oldResp);
    const newSchema = getJsonSchema(newResp);

    if (oldSchema && newSchema) {
      // Removed response fields
      if (oldSchema.properties && newSchema.properties) {
        for (const field of Object.keys(oldSchema.properties)) {
          if (!newSchema.properties[field]) {
            changes.push({
              severity: "breaking",
              changeType: "field_removed",
              path: `${method.toUpperCase()} ${path} response:${code}.${field}`,
              description: `Response field removed: ${field}`,
            });
          }
        }
      }

      // Type changes in response
      if (oldSchema.type && newSchema.type && oldSchema.type !== newSchema.type) {
        changes.push({
          severity: "breaking",
          changeType: "type_changed",
          path: `${method.toUpperCase()} ${path} response:${code}`,
          description: `Response type changed: ${oldSchema.type} → ${newSchema.type}`,
          oldValue: oldSchema.type,
          newValue: newSchema.type,
        });
      }
    }
  }
}

function diffSchemas(
  oldSpec: OpenAPISpec,
  newSpec: OpenAPISpec,
  changes: Change[]
) {
  const oldSchemas = oldSpec.components?.schemas || oldSpec.definitions || {};
  const newSchemas = newSpec.components?.schemas || newSpec.definitions || {};

  for (const [name, oldSchema] of Object.entries(oldSchemas)) {
    const newSchema = newSchemas[name];
    if (!newSchema) {
      changes.push({
        severity: "warning",
        changeType: "schema_removed",
        path: `#/components/schemas/${name}`,
        description: `Schema removed: ${name}`,
      });
      continue;
    }

    // Check required field changes
    const oldRequired = new Set((oldSchema as SchemaObject).required || []);
    const newRequired = new Set((newSchema as SchemaObject).required || []);
    for (const field of newRequired) {
      if (!oldRequired.has(field)) {
        changes.push({
          severity: "breaking",
          changeType: "field_required",
          path: `#/components/schemas/${name}.${field}`,
          description: `Field became required in ${name}: ${field}`,
          oldValue: "optional",
          newValue: "required",
        });
      }
    }

    // Check removed properties
    const oldProps = (oldSchema as SchemaObject).properties || {};
    const newProps = (newSchema as SchemaObject).properties || {};
    for (const field of Object.keys(oldProps)) {
      if (!newProps[field]) {
        changes.push({
          severity: "breaking",
          changeType: "field_removed",
          path: `#/components/schemas/${name}.${field}`,
          description: `Property removed from ${name}: ${field}`,
        });
      } else if (oldProps[field].type && newProps[field].type && oldProps[field].type !== newProps[field].type) {
        changes.push({
          severity: "breaking",
          changeType: "type_changed",
          path: `#/components/schemas/${name}.${field}`,
          description: `Type changed in ${name}.${field}: ${oldProps[field].type} → ${newProps[field].type}`,
          oldValue: oldProps[field].type,
          newValue: newProps[field].type,
        });
      }
    }
  }
}

function getJsonSchema(
  obj: any
): SchemaObject | undefined {
  if (!obj) return undefined;
  if (obj.content?.["application/json"]?.schema) {
    return obj.content["application/json"].schema;
  }
  if (obj.schema) return obj.schema;
  return undefined;
}

/**
 * Fetch an OpenAPI spec from a URL, parse as JSON or YAML.
 */
export async function fetchSpec(url: string): Promise<OpenAPISpec> {
  const resp = await fetch(url, {
    headers: { Accept: "application/json, application/yaml, text/yaml, */*" },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`Failed to fetch spec: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    // Try basic YAML-like parsing for simple specs
    throw new Error("YAML specs require js-yaml — please provide a JSON spec URL");
  }
}
