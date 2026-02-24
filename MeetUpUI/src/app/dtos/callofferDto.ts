export class CallOfferDto {
  from: string;
  to: string;
  offer: RTCSessionDescription;

  constructor(from: string, to: string, offer: RTCSessionDescription) {
    this.from = from;
    this.to = to;
    this.offer = offer;
  }
}