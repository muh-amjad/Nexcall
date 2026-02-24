import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UsersFacade } from '../store/facades/users.facade';
import { CallOfferDto } from '../dtos/callofferDto';

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
  }

  joinUser(username: string) {
    this.hubConnection.invoke('JoinUser', username);
  }

  sendCallOffer(offerData: { to: string; offer: RTCSessionDescription | null }) {
    this.hubConnection.invoke(
      'SendCallOffer',
      new CallOfferDto(this.myConnectionID, offerData.to, offerData.offer!),
    );
  }

  offerIceCandidate(candidate: RTCIceCandidate) {
    this.hubConnection.invoke('SendCandidate', candidate);
    console.log('ICE candidate sent via SignalR: ', candidate);
  }

  userJoined() {
    this.hubConnection.on('UserJoined', (allUsers) => {
      console.log('User joined from server: ', JSON.stringify(allUsers));

      this.userFacade.updateUsersList(allUsers);
    });
  }

  receiveIceCandidate() {
    this.hubConnection.on('ReceiveCandidate', async (candidate: RTCIceCandidate) => {
      console.log('Received ICE candidate from SignalR: ', candidate);
      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(candidate);
          console.log('ICE candidate added to peer connection');
        } catch (error) {
          console.error('Error adding received ICE candidate', error);
        }
      }
    });
  }

  receiveCallOffer() {
    this.hubConnection.on('ReceiveCallOffer', async (callOffer: CallOfferDto) => {
      console.log('Received call offer:', callOffer);
      await this.peerConnection.setRemoteDescription(callOffer.offer);
      const offerAnswer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(offerAnswer);
      this.hubConnection.invoke(
        'SendCallAnswer',
        new CallOfferDto(callOffer.from, callOffer.to, this.peerConnection.localDescription!),
      );
    });
  }

  receiveCallAnswer() {
    this.hubConnection.on('ReceiveCallAnswer', async (callOffer: CallOfferDto) => {
      console.log('Received call answer:', callOffer);
      await this.peerConnection.setRemoteDescription(callOffer.offer);
    });
  }

  // Accepts the component instance, not just the peer connection
  registerPeerConnection(meetupHomeComponent: any) {
    // Always ensure peer connection is set up
    meetupHomeComponent.ensurePeerConnection();
    this.peerConnection = meetupHomeComponent.peerConnection;

    // SignalR handlers
    this.userJoined();
    this.receiveCallOffer();
    this.receiveIceCandidate();
    this.receiveCallAnswer();
  }
}
