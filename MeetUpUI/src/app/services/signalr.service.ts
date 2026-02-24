import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UsersFacade } from '../store/facades/users.facade';

@Injectable()
export class SignalrService {
  private myConnectionID!: string;
  private hubConnection!: signalR.HubConnection;
  private peerConnection!: RTCPeerConnection;

  constructor(private userFacade: UsersFacade) {
    this.createHubConnection();
    this.myConnectionID = '';
  }

  private createHubConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Debug)
      .withUrl('https://localhost:7248/callHub')
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        this.myConnectionID = this.hubConnection.connectionId!;
        console.log('SignalR Connected with ID: ', this.myConnectionID);
      })
      .catch((err) => console.error('SignalR connection failed', err));

      this.userJoinedListener();
  }

  // public sendMessage(message: string) {
  //   this.hubConnection.invoke('SendMessage', message);
  // }

  // public receiveMessage() {
  //   this.hubConnection.on('ReceiveMessage', (message) => {
  //     console.log('Message received: ', message);
  //   });
  // }

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
        // this.sendMessage(JSON.stringify({ type: 'answer', answer }));
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

  joinUser(username: string) {
    this.hubConnection.invoke('JoinUser', username);
  }

  public userJoinedListener() {
    this.hubConnection.on('UserJoined', (allUsers) => {
      console.log('User joined from server: ', JSON.stringify(allUsers));

      // Dispatch to store
      this.userFacade.updateUsersList(allUsers);
    });
  }

  // offerCandidate(candidate: RTCIceCandidate) {
  //   this.hubConnection.invoke('SendCandidate', Context candidate);
  //   console.log('ICE candidate sent via SignalR: ', candidate);
  // }
}
