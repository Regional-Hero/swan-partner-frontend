import { Result } from "@swan-io/boxed";
import { isValid } from "iban";
import { match, P } from "ts-pattern";
import { Client } from "urql";
import { GetIbanValidationDocument } from "../graphql/partner";
import { t } from "./i18n";
import { parseOperationResult } from "./urql";
export { isValid, printFormat } from "iban";

// https://github.com/arhs/iban.js/blob/v0.0.14/iban.js#L341
const EVERY_FOUR_CHARS = /(.{4})(?!$)/g;

export const printMaskedFormat = (iban: string) =>
  iban.replace(EVERY_FOUR_CHARS, `$1 `).toUpperCase();

export const getIbanValidation = async (client: Client, iban: string) => {
  const ibanWithoutSpaces = iban.replace(/ /g, "");

  const result = (
    await Result.fromPromise(
      client
        .query(GetIbanValidationDocument, { iban: ibanWithoutSpaces })
        .toPromise()
        .then(parseOperationResult),
    )
  )
    .mapError(() => "NoIbanValidation" as const)
    .flatMap(({ ibanValidation }) =>
      match(ibanValidation)
        .with(P.nullish, () => Result.Error("NoIbanValidation" as const))
        .with({ __typename: "InvalidIban" }, ({ code }) => Result.Error(code))
        .with({ __typename: "ValidIban" }, validation => Result.Ok(validation))
        .exhaustive(),
    )
    .mapError(error =>
      match(error)
        .with("InvalidLength", "InvalidStructure", "InvalidChecksum", () => t("error.iban.invalid"))
        .with("InvalidBank", () => t("error.iban.invalidBank"))
        .with("NoIbanValidation", () => {
          // If we failed to validate the IBAN with backend, we do local validation
          if (!isValid(iban)) {
            return t("error.iban.invalid");
          }
        })
        .exhaustive(),
    );

  return result;
};
