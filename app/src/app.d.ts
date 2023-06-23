// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace Game {
	/**
	 * * Typings for gameplay systems
	 */

	export interface ShipStatusReport {
		shipName: string;
		engines: number;
		shields: number;
		weapons: number;
		communications: number;
	}

	//
	export interface ShipsStatus {
		playerShip: ShipStatusReport;
		enemyShip: ShipStatusReport;
	}

	/**
	 * * Typings for AI responses
	 */

	export type ShipDamageReport = Partial<ShipStatusReport>;

	export interface ShipsDamage {
		playerShip?: ShipDamageReport;
		enemyShip?: ShipDamageReport;
	}
}
