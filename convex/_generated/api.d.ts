/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as advances from "../advances.js";
import type * as auth from "../auth.js";
import type * as bills from "../bills.js";
import type * as cash from "../cash.js";
import type * as customers from "../customers.js";
import type * as data from "../data.js";
import type * as days from "../days.js";
import type * as http from "../http.js";
import type * as logs from "../logs.js";
import type * as model from "../model.js";
import type * as outbox from "../outbox.js";
import type * as payments from "../payments.js";
import type * as staff from "../staff.js";
import type * as wa from "../wa.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  advances: typeof advances;
  auth: typeof auth;
  bills: typeof bills;
  cash: typeof cash;
  customers: typeof customers;
  data: typeof data;
  days: typeof days;
  http: typeof http;
  logs: typeof logs;
  model: typeof model;
  outbox: typeof outbox;
  payments: typeof payments;
  staff: typeof staff;
  wa: typeof wa;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
