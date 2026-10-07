import { v4 as uuidv4 } from 'uuid';
import {
  Route,
  RouteJunction,
  RouteGeometryPoint,
  Approach,
  Junction,
} from '@green-corridor/shared';
import { store } from '../lib/store';
import { NotFoundError } from '../lib/errors';

interface GraphEdge {
  fromJunction: Junction;
  toJunction: Junction;
  distanceMeters: number;
  entryApproach: Approach;
  exitApproach: Approach;
}

export class RouteService {
  /**
   * Distance in meters using Haversine formula
   */
  static haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radius of Earth in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Builds navigable edges between adjacent junctions in the 3x2 grid
   */
  private static getGridEdges(): GraphEdge[] {
    const junctions = Array.from(store.junctions.values());
    const edges: GraphEdge[] = [];

    junctions.forEach((jA) => {
      junctions.forEach((jB) => {
        if (jA.id === jB.id) return;

        const dx = jB.grid_x - jA.grid_x;
        const dy = jB.grid_y - jA.grid_y;

        // Directly adjacent horizontally
        if (Math.abs(dx) === 1 && dy === 0) {
          const entryApproach: Approach = dx > 0 ? 'W' : 'E';
          const exitApproach: Approach = dx > 0 ? 'E' : 'W';
          edges.push({
            fromJunction: jA,
            toJunction: jB,
            distanceMeters: this.haversineDistanceMeters(jA.lat, jA.lng, jB.lat, jB.lng),
            entryApproach,
            exitApproach,
          });
        }
        // Directly adjacent vertically
        else if (Math.abs(dy) === 1 && dx === 0) {
          const entryApproach: Approach = dy > 0 ? 'N' : 'S';
          const exitApproach: Approach = dy > 0 ? 'S' : 'N';
          edges.push({
            fromJunction: jA,
            toJunction: jB,
            distanceMeters: this.haversineDistanceMeters(jA.lat, jA.lng, jB.lat, jB.lng),
            entryApproach,
            exitApproach,
          });
        }
      });
    });

    return edges;
  }

  /**
   * Computes an optimal emergency route using Dijkstra's shortest path algorithm
   */
  static computeRoute(
    originLat: number,
    originLng: number,
    hospitalId: string
  ): { route: Route; junctions: RouteJunction[] } {
    const hospital = store.hospitals.get(hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital ${hospitalId} not found`);
    }

    const allJunctions = Array.from(store.junctions.values());
    if (allJunctions.length === 0) {
      throw new NotFoundError('No traffic junctions available in the network');
    }

    // 1. Find closest entry junction to origin
    let closestStart = allJunctions[0];
    let minStartDist = Infinity;
    allJunctions.forEach((j) => {
      const d = this.haversineDistanceMeters(originLat, originLng, j.lat, j.lng);
      if (d < minStartDist) {
        minStartDist = d;
        closestStart = j;
      }
    });

    // 2. Find closest destination junction to hospital
    let closestEnd = allJunctions[0];
    let minEndDist = Infinity;
    allJunctions.forEach((j) => {
      const d = this.haversineDistanceMeters(hospital.lat, hospital.lng, j.lat, j.lng);
      if (d < minEndDist) {
        minEndDist = d;
        closestEnd = j;
      }
    });

    // 3. Run Dijkstra from closestStart to closestEnd
    const edges = this.getGridEdges();
    const distances = new Map<string, number>();
    const previous = new Map<string, { junction: Junction; edge: GraphEdge }>();
    const unvisited = new Set<string>();

    allJunctions.forEach((j) => {
      distances.set(j.id, Infinity);
      unvisited.add(j.id);
    });
    distances.set(closestStart.id, 0);

    while (unvisited.size > 0) {
      // Node with minimum distance
      let currentId: string | null = null;
      let lowestDist = Infinity;
      unvisited.forEach((id) => {
        const d = distances.get(id)!;
        if (d < lowestDist) {
          lowestDist = d;
          currentId = id;
        }
      });

      if (!currentId || lowestDist === Infinity) break;
      if (currentId === closestEnd.id) break;

      unvisited.delete(currentId);

      const neighborEdges = edges.filter((e) => e.fromJunction.id === currentId);
      for (const edge of neighborEdges) {
        const neighborId = edge.toJunction.id;
        if (!unvisited.has(neighborId)) continue;

        const newDist = lowestDist + edge.distanceMeters;
        if (newDist < distances.get(neighborId)!) {
          distances.set(neighborId, newDist);
          previous.set(neighborId, {
            junction: edge.fromJunction,
            edge,
          });
        }
      }
    }

    // Reconstruct path
    const pathJunctions: Junction[] = [];
    const usedEdges: GraphEdge[] = [];
    let curr: string | undefined = closestEnd.id;

    if (closestStart.id === closestEnd.id) {
      pathJunctions.push(closestStart);
    } else {
      while (curr && curr !== closestStart.id) {
        const j = store.junctions.get(curr)!;
        pathJunctions.unshift(j);
        const prevItem = previous.get(curr);
        if (!prevItem) break;
        usedEdges.unshift(prevItem.edge);
        curr = prevItem.junction.id;
      }
      pathJunctions.unshift(closestStart);
    }

    // 4. Construct ordered route_junctions
    const routeId = uuidv4();
    const routeJunctions: RouteJunction[] = [];

    for (let i = 0; i < pathJunctions.length; i++) {
      const junction = pathJunctions[i];
      let entryApproach: Approach = 'W';
      let exitApproach: Approach = 'E';

      if (i === 0 && pathJunctions.length > 1) {
        // First junction: determine entry from origin angle, exit towards next junction
        const nextJ = pathJunctions[1];
        if (nextJ.grid_x > junction.grid_x) exitApproach = 'E';
        else if (nextJ.grid_x < junction.grid_x) exitApproach = 'W';
        else if (nextJ.grid_y > junction.grid_y) exitApproach = 'S';
        else exitApproach = 'N';

        // Entry is opposite or based on origin
        if (originLat > junction.lat) entryApproach = 'N';
        else if (originLat < junction.lat) entryApproach = 'S';
        else if (originLng < junction.lng) entryApproach = 'W';
        else entryApproach = 'E';
      } else if (i > 0) {
        const prevEdge = usedEdges[i - 1];
        entryApproach = prevEdge ? prevEdge.entryApproach : 'W';

        if (i < pathJunctions.length - 1) {
          const nextEdge = usedEdges[i];
          exitApproach = nextEdge ? nextEdge.fromJunction.grid_x < nextEdge.toJunction.grid_x ? 'E' : 'W' : 'E';
        } else {
          // Last junction heading to hospital
          if (hospital.lat > junction.lat) exitApproach = 'N';
          else if (hospital.lat < junction.lat) exitApproach = 'S';
          else if (hospital.lng > junction.lng) exitApproach = 'E';
          else exitApproach = 'W';
        }
      }

      const distFromPrev =
        i === 0
          ? this.haversineDistanceMeters(originLat, originLng, junction.lat, junction.lng)
          : usedEdges[i - 1]?.distanceMeters || 1000;

      routeJunctions.push({
        id: uuidv4(),
        route_id: routeId,
        seq: i + 1,
        junction_id: junction.id,
        entry_approach: entryApproach,
        exit_approach: exitApproach,
        distance_from_prev_m: distFromPrev,
        junction,
      });
    }

    // 5. Build geometry points
    const geometry: RouteGeometryPoint[] = [{ lat: originLat, lng: originLng }];
    pathJunctions.forEach((j) => {
      geometry.push({ lat: j.lat, lng: j.lng });
    });
    geometry.push({ lat: hospital.lat, lng: hospital.lng });

    let totalDist = 0;
    for (let k = 1; k < geometry.length; k++) {
      totalDist += this.haversineDistanceMeters(
        geometry[k - 1].lat,
        geometry[k - 1].lng,
        geometry[k].lat,
        geometry[k].lng
      );
    }

    const route: Route = {
      id: routeId,
      name: `Emergency Corridor -> ${hospital.name}`,
      origin_lat: originLat,
      origin_lng: originLng,
      hospital_id: hospital.id,
      geometry,
      distance_m: totalDist,
      created_at: new Date().toISOString(),
      junctions: routeJunctions,
    };

    // Store in memory
    store.routes.set(route.id, route);
    routeJunctions.forEach((rj) => store.route_junctions.set(rj.id, rj));

    return { route, junctions: routeJunctions };
  }
}
