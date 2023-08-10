import json from "../data.json" assert { type: "json" }
export interface UserData {

    immoscout_useLogin: boolean,
    immoscout_username: string,
    immoscout_password: string,
    immoscout_plus_account: boolean,

    chatGtp_active: boolean,
    chatGtp_includeObjectDescriptionInPrompt: boolean
    chatGtp_systemPrompt: string,
    chatGtp_messagePrompt: string,

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

export const userData: UserData = json
