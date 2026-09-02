// Elo ratings for learner and item.
//
// The learner's K decays with experience so early answers move the estimate
// fast and later ones refine it. The item's K is smaller and decays faster, so
// a single learner cannot wreck the bank's calibration -- items are shared
// state, learners are not.

export const START = 1200;

export function expected(learnerRating, itemRating) {
  return 1 / (1 + Math.pow(10, (itemRating - learnerRating) / 400));
}

export function learnerK(responses) {
  return responses < 30 ? 32 : 16;
}

export function itemK(exposures) {
  return exposures < 20 ? 24 : 8;
}

/**
 * @returns {{learner: number, item: number}} updated ratings
 */
export function update({ learnerRating, itemRating, correct, responses = 0, exposures = 0 }) {
  const exp = expected(learnerRating, itemRating);
  const score = correct ? 1 : 0;
  return {
    learner: learnerRating + learnerK(responses) * (score - exp),
    // The item's outcome is the mirror of the learner's.
    item: itemRating + itemK(exposures) * (exp - score),
  };
}
