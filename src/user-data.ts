import json from "../data.json" assert { type: "json" };

export interface UserData {

    immoscout_useLogin: boolean,
    immoscout_username: string,
    immoscout_password: string,
    immoscout_plus_account: boolean,
    immoscout_chatGtp_systemPrompt: string,
    immoscout_chatGtp_messagePrompt: string,
    immoscout_contactMessagePs: string,

    ka_email: string,
    ka_password: string,
    ka_contactMessagePs: string;
    ka_chatGpt_messagePrompt: string,
    ka_chatGpt_systemPrompt: string,

    chatGtp_active: boolean,

    staticContactMessage: string,

    gender: string, //"MALE" | "FEMALE" | "DIVERS";
    moveInDate: string, // "NOW" | "FLEX";
    employmentRelationship: string, // "STUDENT" | "PUBLIC_EMPLOYEE";

    firstname: string,
    lastname: string,
    contactEmail: string,
    phoneNumber: string,

    city: string,
    postalCode: string,
    street: string,
    houseNumber: string,

    incomeAfterTaxes: number
    smoker: boolean,
    petOwner: boolean,
    applicationPackageCompleted: boolean
    numberOfAdults: number
    numberOfKids: number
}

export const userData: UserData = json;
