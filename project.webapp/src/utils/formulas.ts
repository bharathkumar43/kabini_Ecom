// Shared formula utilities for Competitor Insight

export function computeMonthlyGrowth(currentMonth: number, previousMonth: number): number {
	if (!isFinite(currentMonth) || !isFinite(previousMonth) || previousMonth === 0) return 0;
	return ((currentMonth - previousMonth) / previousMonth) * 100;
}

export function computeYearlyGrowth(currentYear: number, previousYear: number): number {
	if (!isFinite(currentYear) || !isFinite(previousYear) || previousYear === 0) return 0;
	return ((currentYear - previousYear) / previousYear) * 100;
}

export function computeAiTrafficShare(aiVisitsMonthly: number, totalVisitsMonthly: number): number {
	if (!isFinite(aiVisitsMonthly) || !isFinite(totalVisitsMonthly) || totalVisitsMonthly === 0) return 0;
	return (aiVisitsMonthly / totalVisitsMonthly) * 100;
}

export function computeAiCitationScore(brandMentionsMonthly: number, medianCompetitorMentionsMonthly: number): number {
	if (!isFinite(brandMentionsMonthly) || !isFinite(medianCompetitorMentionsMonthly) || medianCompetitorMentionsMonthly === 0) return 0;
	return brandMentionsMonthly / medianCompetitorMentionsMonthly;
}

export function computeChannelPercentage(platformVisitsMonthly: number, totalAiVisitsMonthly: number): number {
	if (!isFinite(platformVisitsMonthly) || !isFinite(totalAiVisitsMonthly) || totalAiVisitsMonthly === 0) return 0;
	return (platformVisitsMonthly / totalAiVisitsMonthly) * 100;
}

export function computeRelativeAiVisibility(yourAiCitationsMonthly: number, medianCompetitorAiCitationsMonthly: number): number {
	if (!isFinite(yourAiCitationsMonthly) || !isFinite(medianCompetitorAiCitationsMonthly) || medianCompetitorAiCitationsMonthly === 0) return 0;
	return yourAiCitationsMonthly / medianCompetitorAiCitationsMonthly;
}

export function median(values: number[]): number {
	const nums = values.filter((v) => isFinite(v)).sort((a, b) => a - b);
	if (nums.length === 0) return 0;
	const mid = Math.floor(nums.length / 2);
	return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

// Helper: normalize percentages to ensure safe rounding without NaNs
export function toPercent(value: number): number {
	if (!isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}





