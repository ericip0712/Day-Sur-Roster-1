// The "Brain" of your GitHub Tool
const generateEveningRoster = (apns, orNurses, dsNurses) => {
    let roster = [];
    
    // Rule 1: Tracking usage to ensure 1 shift per week
    let weeklyUsage = new Set();

    days.forEach(day => {
        // Slot 1: 10:12 - 19:00
        // Logic to pick 1 APN, 1 OR, 1 DS who hasn't worked yet this week
        let slot1 = assignStaff(apns, orNurses, dsNurses, weeklyUsage);
        roster.push({ day, time: "10:12", staff: slot1 });

        // Slot 2: 12:12 - 21:00
        let slot2 = assignStaff(apns, orNurses, dsNurses, weeklyUsage);
        roster.push({ day, time: "12:12", staff: slot2 });
    });

    return roster;
};
