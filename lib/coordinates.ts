export function roundPickupCoordinate(coordinate: number): number {
  return Number(coordinate.toFixed(6));
}

export function roundPickupPosition(position: [number, number]): [number, number] {
  return [roundPickupCoordinate(position[0]), roundPickupCoordinate(position[1])];
}
