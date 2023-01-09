import { Policy } from '../utils/types';

export const defaultPolicies: Policy[] = [
    { description: 'Universal healthcare', coordinates: [-9, -9] },
    { description: 'Carbon tax', coordinates: [-8, 8] },
    { description: 'State-funded insurance system with private hospitals', coordinates: [-6, 6] },
    { description: 'Free public education', coordinates: [-9, -7] },
    { description: 'Flat income tax', coordinates: [-7, 7] },
    { description: 'Gun control laws', coordinates: [-8, 8] },
    { description: 'Capital punishment', coordinates: [-6, 8] },
    { description: 'Tariffs on imports', coordinates: [-9, 7] },
    { description: 'Increased military spending', coordinates: [10, 8] },
    { description: 'Universal basic income', coordinates: [-10, -7] },
    { description: 'Net neutrality', coordinates: [-9, -7] },
    { description: 'Increased infrastructure spending', coordinates: [-9, -6] },
    { description: 'Increased environmental regulations', coordinates: [-8, 8] },
    { description: 'Increased immigration', coordinates: [-9, -7] },
    { description: 'Private prisons', coordinates: [-5, 8] },
    { description: 'National service program', coordinates: [-6, 8] },
];

function describeCoordinate(
    value: number,
    valueLabel: string,
    strongThreshold: number,
    negativeLabel: string,
    positiveLabel: string,
    neutralLabel: string = 'Neutral',
    strongLabel: string = 'Strongly'
): string {
    let parts = [];

    // Round and then clamp the value between -10 and 10.
    value = Math.min(Math.max(Math.round(value), -10), 10);

    // (Adverb) Check for strong match.
    if (Math.abs(value) > strongThreshold) parts.push(strongLabel);

    // (Adjective) Push the value label.
    parts.push(valueLabel);

    // (Verb) Push the strength descriptor.
    if (value == 0) parts.push(neutralLabel);
    else parts.push(value > 0 ? positiveLabel : negativeLabel);

    return parts.join(' ');
}

export function getDescriptionForCoordinates(coordinates: number[]): string {
    let values = [];
    values.push(describeCoordinate(coordinates[0], 'Economic', 7, 'Left', 'Right'));
    values.push(describeCoordinate(coordinates[1], 'Social', 7, 'Libertarian', 'Authoritarian'));
    return values.join(', ');
}
