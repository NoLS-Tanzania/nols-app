/// <reference types="node" />
// Extend Express Request types or global types here if needed
declare module 'ip-cidr' {
	export default class CIDR {
		constructor(cidr: string);
		contains(ip: string): boolean;
	}
}
