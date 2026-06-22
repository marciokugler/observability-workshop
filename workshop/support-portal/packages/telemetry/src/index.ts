import { BUSINESS_TRANSACTIONS } from "@support-portal/shared-types";
import { appVersion, deploymentEnvironment, serviceNamespace } from "./config";

export const businessTransactionLabels = {
  [BUSINESS_TRANSACTIONS.customerSupportResponse]: "AI Support Response",
  [BUSINESS_TRANSACTIONS.caseStatusLookup]: "Account Status Lookup",
  [BUSINESS_TRANSACTIONS.knowledgeArticleSearch]: "Help Article Search",
  [BUSINESS_TRANSACTIONS.legacyCustomerSupportResponse]: "AI Support Response",
  [BUSINESS_TRANSACTIONS.legacyCaseStatusLookup]: "Account Status Lookup",
  [BUSINESS_TRANSACTIONS.legacyKnowledgeArticleSearch]: "Help Article Search"
};

export function buildTelemetryAttributes(transaction: keyof typeof businessTransactionLabels | string) {
  return {
    "service.namespace": serviceNamespace,
    "deployment.environment": deploymentEnvironment,
    "service.version": appVersion,
    "app.version": appVersion,
    "app.business_transaction": transaction
  };
}

export * from "./node";
export * from "./splunk-node";
export * from "./logger";
export * from "./config";
