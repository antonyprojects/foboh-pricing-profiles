/**
 * OpenAPI 3.0 spec for the pricing API. Hand-authored so the contract
 * is the source of truth, not a side-effect of code annotations.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FOBOH Pricing Profiles API",
    version: "0.1.0",
    description:
      "Customer-specific pricing for food & beverage suppliers. CRUD for pricing " +
      "profiles, a resolver that picks the winning profile for a (customer, product) " +
      "pair using specificity-based precedence, and read endpoints for the catalogue.",
  },
  servers: [{ url: "http://localhost:4000", description: "Local dev" }],
  tags: [
    { name: "health" },
    { name: "products" },
    { name: "customers" },
    { name: "profiles", description: "Pricing profile CRUD" },
    { name: "pricing", description: "Resolve effective price for a (customer, product)" },
  ],
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "NOT_FOUND" },
              message: { type: "string" },
              details: {},
            },
          },
        },
      },
      Product: {
        type: "object",
        required: ["sku", "title", "brand", "subCategory", "segment", "basePrice"],
        properties: {
          sku: { type: "string", example: "KOYBRUNV6" },
          title: { type: "string", example: "Koyama Methode Brut Nature NV" },
          brand: { type: "string", example: "Koyama Wines" },
          subCategory: { type: "string", example: "Sparkling" },
          segment: { type: "string", example: "Wine" },
          basePrice: { type: "number", format: "float", example: 120 },
          active: { type: "boolean", default: true },
        },
      },
      Customer: {
        type: "object",
        required: ["id", "name", "groups"],
        properties: {
          id: { type: "string", example: "cust_bondi_cellars" },
          name: { type: "string", example: "Bondi Cellars" },
          groups: {
            type: "array",
            items: { type: "string" },
            example: ["grp_independent_retailers", "grp_vip"],
          },
        },
      },
      AdjustmentKind: { type: "string", enum: ["fixed", "dynamic", "absolute"] },
      AdjustmentDirection: { type: "string", enum: ["increase", "decrease"] },
      Adjustment: {
        type: "object",
        required: ["kind", "value"],
        description:
          "kind=fixed: New = Base ±value. kind=dynamic: New = Base ±(value% × Base). " +
          "kind=absolute: New = value (direction ignored). New price is floored at 0.",
        properties: {
          kind: { $ref: "#/components/schemas/AdjustmentKind" },
          direction: { $ref: "#/components/schemas/AdjustmentDirection" },
          value: { type: "number", minimum: 0, example: 10 },
        },
      },
      CustomerScope: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["customer", "customer_group", "all_customers"] },
          customerId: { type: "string", nullable: true },
          groupId: { type: "string", nullable: true },
        },
      },
      ProductScope: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: {
            type: "string",
            enum: ["sku", "brand", "sub_category", "segment", "all_products"],
          },
          sku: { type: "string", nullable: true },
          brand: { type: "string", nullable: true },
          subCategory: { type: "string", nullable: true },
          segment: { type: "string", nullable: true },
          skus: {
            type: "array",
            items: { type: "string" },
            nullable: true,
            description:
              "Optional explicit set of SKUs the supplier picked at build time. " +
              "Acts as a hard filter on top of `kind`.",
          },
        },
      },
      PricingProfile: {
        type: "object",
        required: ["id", "name", "customerScope", "productScope", "adjustment", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", example: "prof_01HK..." },
          name: { type: "string", example: "10% off Wine for Independent Retailers" },
          description: { type: "string", nullable: true },
          customerScope: { $ref: "#/components/schemas/CustomerScope" },
          productScope: { $ref: "#/components/schemas/ProductScope" },
          adjustment: { $ref: "#/components/schemas/Adjustment" },
          priority: {
            type: "integer",
            description: "Manual override; lower wins. Defaults to 100.",
            default: 100,
          },
          active: { type: "boolean", default: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProfileRequest: {
        type: "object",
        required: ["name", "customerScope", "productScope", "adjustment"],
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
          customerScope: { $ref: "#/components/schemas/CustomerScope" },
          productScope: { $ref: "#/components/schemas/ProductScope" },
          adjustment: { $ref: "#/components/schemas/Adjustment" },
          priority: { type: "integer", default: 100 },
          active: { type: "boolean", default: true },
        },
      },
      PreviewLine: {
        type: "object",
        properties: {
          sku: { type: "string" },
          title: { type: "string" },
          basePrice: { type: "number" },
          newPrice: { type: "number" },
          delta: { type: "number" },
          deltaPct: { type: "number" },
        },
      },
      ResolveResponse: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          sku: { type: "string" },
          basePrice: { type: "number" },
          price: { type: "number", description: "Final price after applying the winning profile." },
          sourceProfileId: { type: "string", nullable: true },
          sourceProfileName: { type: "string", nullable: true },
          reason: { type: "string", description: "Plain-English explanation of why this profile won." },
          considered: {
            type: "array",
            description: "All profiles that matched, in precedence order. First is the winner.",
            items: {
              type: "object",
              properties: {
                profileId: { type: "string" },
                profileName: { type: "string" },
                specificity: {
                  type: "object",
                  properties: {
                    customer: { type: "integer" },
                    product: { type: "integer" },
                    priority: { type: "integer" },
                  },
                },
                computedPrice: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["health"],
        summary: "Liveness probe",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/products": {
      get: {
        tags: ["products"],
        summary: "List products (with optional filters)",
        parameters: [
          { in: "query", name: "q", schema: { type: "string" }, description: "Free-text on title or SKU." },
          { in: "query", name: "brand", schema: { type: "string" } },
          { in: "query", name: "subCategory", schema: { type: "string" } },
          { in: "query", name: "segment", schema: { type: "string" } },
          { in: "query", name: "limit", schema: { type: "integer", default: 100 } },
          { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          200: {
            description: "Page of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    total: { type: "integer" },
                    facets: {
                      type: "object",
                      properties: {
                        brands: { type: "array", items: { type: "string" } },
                        subCategories: { type: "array", items: { type: "string" } },
                        segments: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/customers": {
      get: {
        tags: ["customers"],
        summary: "List customers",
        responses: {
          200: {
            description: "All customers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Customer" } },
                    groups: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/profiles": {
      get: {
        tags: ["profiles"],
        summary: "List pricing profiles",
        responses: {
          200: {
            description: "All profiles",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/PricingProfile" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["profiles"],
        summary: "Create a pricing profile",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateProfileRequest" } },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PricingProfile" } },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/profiles/{id}": {
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
      get: {
        tags: ["profiles"],
        summary: "Fetch a profile",
        responses: {
          200: { description: "Profile", content: { "application/json": { schema: { $ref: "#/components/schemas/PricingProfile" } } } },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["profiles"],
        summary: "Replace a profile",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProfileRequest" } } },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/PricingProfile" } } } },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["profiles"],
        summary: "Delete a profile",
        responses: { 204: { description: "Deleted" }, 404: { description: "Not found" } },
      },
    },
    "/api/profiles/preview": {
      post: {
        tags: ["profiles"],
        summary: "Preview the prices a profile would produce, without saving",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProfileRequest" } } },
        },
        responses: {
          200: {
            description: "Per-product preview",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/PreviewLine" } },
                    summary: {
                      type: "object",
                      properties: {
                        count: { type: "integer" },
                        avgDelta: { type: "number" },
                        avgDeltaPct: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/pricing/resolve": {
      get: {
        tags: ["pricing"],
        summary: "Resolve the effective price for a (customer, product) pair",
        parameters: [
          { in: "query", name: "customerId", required: true, schema: { type: "string" } },
          { in: "query", name: "sku", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Resolved price with rationale",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveResponse" } } },
          },
          404: { description: "Unknown customer or product" },
        },
      },
    },
  },
};
