export type ReviewState = {
  success: boolean;
  message: string;
};

export const initialReviewState: ReviewState = {
  success: false,
  message: "",
};
