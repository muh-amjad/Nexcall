import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable()
export class SignalrService {
  private hubConnection!: signalR.HubConnection;
  private peerConnection!: RTCPeerConnection;

  constructor() {
    this.createHubConnection();
  }

  private createHubConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://192.168.0.101:7248/callHub')
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('SignalR Connected ✅'))
      .catch((err) => console.error('SignalR connection failed', err));
  }

  public sendMessage(message: string) {
    this.hubConnection.invoke('SendMessage', message);
  }

  public receiveMessage() {
    this.hubConnection.on('ReceiveMessage', (message) => {
      console.log('Message received: ', message);
    });
  }

  // Accepts the component instance, not just the peer connection
  registerPeerConnection(meetupHomeComponent: any) {
    // Always ensure peer connection is set up
    meetupHomeComponent.ensurePeerConnection();
    this.peerConnection = meetupHomeComponent.peerConnection;

    // SignalR handlers
    this.hubConnection.on('ReceiveMessage', async (message) => {
      const data = JSON.parse(message);
      meetupHomeComponent.ensurePeerConnection();
      this.peerConnection = meetupHomeComponent.peerConnection;
      if (data.type === 'offer') {
        console.log('Offer received');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.sendMessage(JSON.stringify({ type: 'answer', answer }));
      } else if (data.type === 'answer') {
        console.log('Answer received');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === 'ice') {
        console.log('ICE candidate received');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Optionally, handle other custom SignalR events as needed
  }
}
