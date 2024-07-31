import {
  Controller,
  Post,
  Headers,
  Get,
  RawBodyRequest,
  Req,
  Res,
  Inject,
  Body,
} from "@nestjs/common";
import { Request, Response } from "express";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";

@Controller()
export class AppController {
  private readonly client: Stripe;
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.client = new Stripe(this.config.get("Stripe.secret_key"), {
      typescript: true,
      apiVersion: "2022-11-15",
    });
  }

  @Get("/")
  async index(): Promise<string> {
    return "ok";
  }

  @Post("/intent")
  async intent(
    @Body() req: { buyerWalletAddress: string },
    @Res() res: Response
  ) {
    const { buyerWalletAddress } = req;
    if (!buyerWalletAddress) {
      throw 'Request is missing "buyerWalletAddress"';
    }

    try {
      // Create a Stripe payment intent for $100 USD.
      const paymentIntent = await this.client.paymentIntents.create({
        amount: 100_00,
        currency: "usd",
        description: "Example NFT",
        payment_method_types: ["card"],
        metadata: { buyerWalletAddress },
      });
      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Stripe Intent Error: ${err.message}`);
      return;
    }
  }

  @Post("/webhook")
  async webhook(
    @Headers("stripe-signature") sig: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    let event: Stripe.Event;

    try {
      event = this.client.webhooks.constructEvent(
        req.rawBody,
        sig,
        this.config.get("Stripe.webhook_secret")
      );
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Successfully constructed event
    console.log("✅ Success:", event.id);

    // Cast event data to Stripe object
    if (event.type === "payment_intent.succeeded") {
      const stripeObject: Stripe.PaymentIntent = event.data
        .object as Stripe.PaymentIntent;
      console.log(`💰 PaymentIntent status: ${stripeObject.status}`);
    } else if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);
    } else {
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  }
}
