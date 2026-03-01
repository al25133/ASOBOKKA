export type ParsedCondition = {
	spendingStyle: string | null;
	distance: string | null;
	crowd: string | null;
	budget: number | null;
	time: string | null;
};

export type ConditionSelectable = {
	selected_value: string | null;
};

export const spendingScale = ["のんびり", "ゆったり", "おまかせ", "食べ歩き", "アクティブ"];
export const distanceScale = ["徒歩圏", "電車1駅", "電車2〜3駅", "30分以内", "どこでも"];
export const crowdScale = ["とても少なめ", "少なめ", "ふつう", "にぎやか", "とてもにぎやか"];
export const timeScale = ["1時間以内", "2時間くらい", "3時間くらい", "半日", "終日"];

export function aggregate(items: Array<string | null>) {
	return items.reduce<Record<string, number>>((acc, item) => {
		if (!item) {
			return acc;
		}
		acc[item] = (acc[item] ?? 0) + 1;
		return acc;
	}, {});
}

export function parseCondition(raw: string | null): ParsedCondition {
	if (!raw) {
		return {
			spendingStyle: null,
			distance: null,
			crowd: null,
			budget: null,
			time: null,
		};
	}

	const getPart = (key: string) => {
		const match = raw.match(new RegExp(`${key}:([^/]+)`));
		return match?.[1]?.trim() ?? null;
	};

	return {
		spendingStyle: getPart("過ごし方"),
		distance: getPart("距離"),
		crowd: getPart("人の多さ"),
		budget: (() => {
			const budgetRaw = getPart("予算");
			if (!budgetRaw) {
				return null;
			}
			const normalized = Number(budgetRaw.replace(/[^0-9]/g, ""));
			return Number.isFinite(normalized) ? normalized : null;
		})(),
		time: getPart("時間"),
	};
}

export function indexFromScale(scale: string[], value: string | null) {
	if (!value) {
		return 3;
	}
	const index = scale.findIndex((item) => item === value);
	return index >= 0 ? index + 1 : 3;
}

export function budgetToScale(budget: number | null) {
	if (budget === null) {
		return 3;
	}
	if (budget <= 20000) {
		return 1;
	}
	if (budget <= 40000) {
		return 2;
	}
	if (budget <= 60000) {
		return 3;
	}
	if (budget <= 80000) {
		return 4;
	}
	return 5;
}

export function toRadarValues(condition: ParsedCondition) {
	return [
		indexFromScale(spendingScale, condition.spendingStyle),
		indexFromScale(distanceScale, condition.distance),
		indexFromScale(crowdScale, condition.crowd),
		budgetToScale(condition.budget),
		indexFromScale(timeScale, condition.time),
	];
}

export function toRadarAverageValues(conditions: ParsedCondition[]) {
	if (conditions.length === 0) {
		return [3, 3, 3, 3, 3];
	}

	const scoreRows = conditions.map((condition) => toRadarValues(condition));

	return [0, 1, 2, 3, 4].map((axisIndex) => {
		const sum = scoreRows.reduce((acc, values) => acc + (values[axisIndex] ?? 0), 0);
		return Number((sum / scoreRows.length).toFixed(1));
	});
}