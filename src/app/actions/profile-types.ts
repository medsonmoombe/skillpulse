export type ProfileActionState = {
  success: boolean;
  message: string;
};

export const initialProfileActionState: ProfileActionState = {
  success: false,
  message: "",
};
