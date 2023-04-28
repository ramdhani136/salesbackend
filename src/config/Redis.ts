import { createClient } from "redis";

class Redis {
  public client!: ReturnType<typeof createClient>;

  public async getConnect(): Promise<void> {
    if (!this.client) {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT
            ? parseInt(process.env.REDIS_PORT)
            : 6379,
        },
      });

      this.client.on("error", (err: any) =>
        console.log("Redis Client Error", err)
      );

      await this.client.connect();
      await this.client.select(
        process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0
      );
    }
  }
}

export default new Redis();
