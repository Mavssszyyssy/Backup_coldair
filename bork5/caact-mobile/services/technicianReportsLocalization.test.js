import { translateText } from "./interfaceI18n";

test("technician report and service-history navigation labels have Filipino translations", () => {
  expect(translateText("Reports & activity", "Filipino")).toBe("Mga ulat at aktibidad");
  expect(translateText("AI maintenance guidance & report", "Filipino")).toBe("Gabay at ulat sa maintenance mula sa AI");
  expect(translateText("Service activity & history", "Filipino")).toBe("Aktibidad at kasaysayan ng serbisyo");
  expect(translateText("Visit activity & service history", "Filipino")).toBe("Aktibidad ng pagbisita at kasaysayan ng serbisyo");
});
