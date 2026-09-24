/** Candidate scoring — same rule as the API `summary` action: ◯=2, △=1, ×=0; ties -> earlier candidate */

import type { Candidate } from '../api/types';

export interface CandidateScore {
    candidate: Candidate;
    score: number;
    isRecommended: boolean;
}

export function scoreCandidates(candidates: Candidate[]): CandidateScore[] {
    const items: CandidateScore[] = [...candidates]
        .sort((a, b) => a.order - b.order || new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        .map((candidate) => ({
            candidate,
            score: candidate.ok_count * 2 + candidate.maybe_count,
            isRecommended: false,
        }));
    let bestIndex = -1;
    items.forEach((item, index) => {
        if (item.score > 0 && (bestIndex < 0 || item.score > items[bestIndex].score)) bestIndex = index;
    });
    if (bestIndex >= 0) items[bestIndex].isRecommended = true;
    return items;
}
