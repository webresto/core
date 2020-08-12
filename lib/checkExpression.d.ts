import { Time } from "../modelsHelp/Cause";
export default function (obj: AdditionalInfo): string;
export interface AdditionalInfo {
    visible: boolean;
    workTime: Time[];
    promo: boolean;
    modifier: boolean;
}
