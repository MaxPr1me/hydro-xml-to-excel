function effectiveLoad(load) {
    return load.continuous ? load.amps * 1.25 : load.amps;
}
export function diversifiedLoad(loads) {
    return loads.reduce((sum, load) => sum + effectiveLoad(load), 0);
}
export function calculateVerdict(inputs, demandAmps) {
    const existing = diversifiedLoad(inputs.existingLoads);
    const additions = diversifiedLoad(inputs.newLoads);
    const diversified = Math.max(existing, demandAmps) + additions;
    const available = inputs.mainBreaker - diversified;
    let status = 'OK';
    let message = 'Demand appears to be within the service rating.';
    if (available < 0) {
        status = 'Upgrade';
        message = 'Calculated load exceeds the main breaker rating; consider an upgrade.';
    }
    else if (available < inputs.mainBreaker * 0.1) {
        status = 'Review';
        message = 'Available margin is slim; review with a licensed electrician.';
    }
    return {
        diversifiedLoad: diversified,
        availableMargin: available,
        status,
        message
    };
}
export function defaultPanelInputs() {
    return {
        serviceRating: 200,
        mainBreaker: 200,
        busRating: 225,
        voltage: 240,
        existingLoads: [],
        newLoads: []
    };
}
