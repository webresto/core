export default interface Cause {
    workTime: Time[];
    cartAmount: {
        valueFrom: number;
        valueTo: number;
    };
    dishes: string[];
    groups: string[];
    directDistance: DirectDistance;
}
export interface Time {
    dayOfWeek: 'all' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    daysOfWeek: ['all' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'];
    start: string;
    end: string;
}
export interface DirectDistance {
    center: number[];
    from: number;
    to: number;
}
