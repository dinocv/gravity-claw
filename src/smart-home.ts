export class CryptoManager {
    private watchlist: string[] = ["bitcoin", "ethereum", "solana"];
    private prices: Map<string, number> = new Map();

    async getPrices(): Promise<Record<string, number>> {
        try {
            const response = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,dogecoin&vs_currencies=usd"
            );
            const data = await response.json();
            
            this.prices.set("bitcoin", data.bitcoin?.usd || 0);
            this.prices.set("ethereum", data.ethereum?.usd || 0);
            this.prices.set("solana", data.solana?.usd || 0);
            this.prices.set("cardano", data.cardano?.usd || 0);
            this.prices.set("dogecoin", data.dogecoin?.usd || 0);

            return {
                bitcoin: data.bitcoin?.usd || 0,
                ethereum: data.ethereum?.usd || 0,
                solana: data.solana?.usd || 0,
                cardano: data.cardano?.usd || 0,
                dogecoin: data.dogecoin?.usd || 0,
            };
        } catch (err) {
            console.error("❌ Crypto prices fetch failed:", err);
            return {};
        }
    }

    async getPortfolioValue(holdings: Record<string, number>): Promise<number> {
        const prices = await this.getPrices();
        let total = 0;
        
        for (const [coin, amount] of Object.entries(holdings)) {
            total += (prices[coin] || 0) * amount;
        }
        
        return total;
    }

    async getMarketNews(): Promise<string[]> {
        try {
            const response = await fetch(
                "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5"
            );
            const data = await response.json();
            
            return data.map((coin: any) => 
                `${coin.name}: $${coin.current_price.toLocaleString()} (${coin.price_change_percentage_24h?.toFixed(2)}%)`
            );
        } catch (err) {
            console.error("❌ Market news failed:", err);
            return [];
        }
    }

    addToWatchlist(coin: string): void {
        if (!this.watchlist.includes(coin.toLowerCase())) {
            this.watchlist.push(coin.toLowerCase());
        }
    }

    getWatchlist(): string[] {
        return this.watchlist;
    }
}

export class SmartHomeManager {
    private devices: Map<string, any> = new Map();
    private PhilipsHueBridge: string | null = null;

    constructor() {
        this.initDevices();
    }

    private initDevices() {
        // Mock devices - in real implementation, this would connect to actual hubs
        this.devices.set("living_room_light", { type: "light", state: "off", brightness: 100 });
        this.devices.set("bedroom_light", { type: "light", state: "off", brightness: 100 });
        this.devices.set("thermostat", { type: "thermostat", temperature: 72, mode: "auto" });
    }

    async setDevice(deviceId: string, state: any): Promise<boolean> {
        const device = this.devices.get(deviceId);
        if (!device) return false;

        // In real implementation, this would call actual APIs
        Object.assign(device, state);
        this.devices.set(deviceId, device);
        console.log(`🏠 Device ${deviceId} set to:`, state);
        return true;
    }

    async getDevices(): Promise<Record<string, any>> {
        const result: Record<string, any> = {};
        for (const [id, device] of this.devices) {
            result[id] = device;
        }
        return result;
    }

    async controlLight(room: string, action: "on" | "off" | "toggle", brightness?: number): Promise<string> {
        const deviceId = `${room}_light`;
        const device = this.devices.get(deviceId);
        
        if (!device) return `Device not found: ${deviceId}`;
        
        let newState = action;
        if (action === "toggle") {
            newState = device.state === "off" ? "on" : "off";
        }
        
        await this.setDevice(deviceId, { 
            state: newState,
            ...(brightness !== undefined && { brightness })
        });
        
        return `🏠 ${room} light turned ${newState}`;
    }

    async setTemperature(temp: number): Promise<string> {
        await this.setDevice("thermostat", { temperature: temp });
        return `🏠 Thermostat set to ${temp}°F`;
    }

    async getStatus(): Promise<string> {
        const devices = await this.getDevices();
        let status = "🏠 Smart Home Status:\n";
        
        for (const [id, device] of Object.entries(devices)) {
            if (device.type === "light") {
                status += `• ${id}: ${device.state} (${device.brightness}%)\n`;
            } else if (device.type === "thermostat") {
                status += `• Thermostat: ${device.temperature}°F (${device.mode})\n`;
            }
        }
        
        return status;
    }
}
