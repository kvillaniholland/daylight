import { DateTime, Duration } from "luxon";
import Store from "./Store";

export const Parsing = {
    parseDate: (input) => {
        if (input === "now") {
            return DateTime.local();
        }
        const regex = /(\d{1,2}):(\d{1,2})(am|pm)/g;
        const [x, hour, minute, half] = regex.exec(input);
        return DateTime.fromObject({
            minute: Number(minute),
            hour:
                half === "am" || hour == "12"
                    ? Number(hour)
                    : Number(hour) + 12,
        });
    },
    parseDuration: (input) => {
        return Duration.fromObject({ minutes: Number(input) });
    },
};

export const Formatting = {
    formatTime: (date) => {
        return date?.toFormat("hh:mma").replace("AM", "am").replace("PM", "pm");
    },
    formatDuration: (duration) => {
        return duration.as("minutes");
    },
    formatCategory: (categoryId: number) => {
        return Store.categories[categoryId];
    },
};
