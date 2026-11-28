import { describe, expect, it } from "vitest";
import { m } from "../paraglide/messages";

// Every message with a {count} picks its singular or plural variant from Intl.PluralRules.
const cases = [
	{
		key: "event_time_slots",
		message: m.event_time_slots,
		en: ["1 time slot", "2 time slots"],
		et: ["1 ajavõimalus", "2 ajavõimalust"],
	},
	{
		key: "home_event_responded",
		message: m.home_event_responded,
		en: ["1 person responded", "2 people responded"],
		et: ["1 inimene vastas", "2 inimest vastas"],
	},
	{
		key: "home_total_events",
		message: m.home_total_events,
		en: ["1 event created so far", "2 events created so far"],
		et: ["Seni on loodud 1 üritus", "Seni on loodud 2 üritust"],
	},
	{
		key: "calendar_import_result_removed",
		message: m.calendar_import_result_removed,
		en: ["1 busy slot removed from your selection", "2 busy slots removed from your selection"],
		et: ["1 hõivatud aeg eemaldati sinu valikust", "2 hõivatud aega eemaldati sinu valikust"],
	},
	{
		key: "calendar_import_result_none_selected",
		message: m.calendar_import_result_none_selected,
		en: ["1 busy slot found, it was not selected", "2 busy slots found, none were selected"],
		et: [
			"Leiti 1 hõivatud aeg, see polnud valitud",
			"Leiti 2 hõivatud aega, ükski neist polnud valitud",
		],
	},
] as const;

describe("count messages", () => {
	for (const { key, message, en, et } of cases) {
		for (const [locale, [one, two]] of [
			["en", en],
			["et", et],
		] as const) {
			it(`${key} (${locale}) uses the singular for 1 and the plural for 2`, () => {
				expect(message({ count: 1 }, { locale })).toBe(one);
				expect(message({ count: 2 }, { locale })).toBe(two);
			});
		}
	}

	it("uses the plural for 0", () => {
		expect(m.event_time_slots({ count: 0 }, { locale: "en" })).toBe("0 time slots");
		expect(m.event_time_slots({ count: 0 }, { locale: "et" })).toBe("0 ajavõimalust");
	});

	it("formats the total events count for the locale", () => {
		expect(m.home_total_events({ count: 12345 }, { locale: "en" })).toBe(
			"12,345 events created so far",
		);
		expect(m.home_total_events({ count: 12345 }, { locale: "et" })).toMatch(
			/^Seni on loodud 12\s345 üritust$/,
		);
	});
});
