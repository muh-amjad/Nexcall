import { inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UsersFacade } from '../store/facades/users.facade';
import { CallOfferDto } from '../dtos/callofferDto';
import { CallFacade } from '../store/facades/call.facade';
import { MeetupHome } from '../pages/meetup-home/meetup-home';

@Injectable()
export class SignalrService {
  private userFacade = inject(UsersFacade);
  private callFacade = inject(CallFacade);
  private myConnectionID!: string;
  private hubConnection!: signalR.HubConnection;
  private peerConnection!: RTCPeerConnection;
  private caller: string[] = [];

  private meetupComponentInstance!: MeetupHome;

  constructor() {
    this.createHubConnection();
    this.myConnectionID = '';
  }

  private createHubConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
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

    this.hubConnection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
    });
  }

  setPeerConnection(peerConnection: RTCPeerConnection) {
    this.peerConnection = peerConnection;
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

  callEnded() {
    this.hubConnection.invoke('CallEnded', this.caller[0], this.caller[1]);
  }

  async sendRestartOffer(targetUserId: string, offer: RTCSessionDescriptionInit) {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.error('[SignalR] Connection not ready');
      return;
    }

    try {
      await this.hubConnection.invoke('SendRestartOffer', targetUserId, offer);
      console.log('[SignalR] Restart offer sent');
    } catch (error) {
      console.error('[SignalR] Failed to send restart offer', error);
    }
  }

  private userJoined() {
    this.hubConnection.on('UserJoined', (allUsers) => {
      console.log('User joined from server: ', JSON.stringify(allUsers));

      this.userFacade.updateUserList(allUsers);
    });
  }

  private receiveIceCandidate() {
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

  private receiveCallOffer() {
    this.hubConnection.on('ReceiveCallOffer', async (callOffer: CallOfferDto) => {
      console.log('Received call offer:', callOffer);

      if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
        this.meetupComponentInstance.setupPeerConnection();
      }

      await this.peerConnection.setRemoteDescription(callOffer.offer);
      const offerAnswer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(offerAnswer);
      this.hubConnection.invoke(
        'SendCallAnswer',
        new CallOfferDto(callOffer.from, callOffer.to, this.peerConnection.localDescription!),
      );
      this.caller = [callOffer.from, callOffer.to];
    });
  }

  private receiveCallAnswer() {
    this.hubConnection.on('ReceiveCallAnswer', async (callOffer: CallOfferDto) => {
      console.log('Received call answer:', callOffer);
      await this.peerConnection.setRemoteDescription(callOffer.offer);
      this.hubConnection.invoke('CallStarted', callOffer.from, callOffer.to);
      this.caller = [callOffer.from, callOffer.to];
    });
  }

  private receiveCallStarted() {
    this.hubConnection.on('CallStarted', () => {
      this.callFacade.updateCallState(true);
    });
  }

  private receiveCallEnded() {
    this.hubConnection.on('CallEnded', (from: string, to: string) => {
      console.log(`Call ended by ${from} for ${to}`);
      this.endCall();
    });
  }

  private receiveRestartOffer() {
    this.hubConnection.on('ReceiveRestartOffer', async (offer) => {
      console.log('[SignalR] Restart offer received');

      if (!this.peerConnection) {
        console.warn('PeerConnection not ready');
        return;
      }

      await this.peerConnection.setRemoteDescription(offer);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await this.hubConnection.invoke('SendCallAnswer', answer);
    });
  }

  attachSignalRHandlers() {
    this.userJoined();
    this.receiveCallOffer();
    this.receiveIceCandidate();
    this.receiveCallAnswer();
    this.receiveCallStarted();
    this.receiveCallEnded();
    this.receiveRestartOffer();
  }

  endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.callFacade.updateCallState(false);

      this.caller = [];
      console.log('Peer connection closed and call state updated');
    }
  }

  setComponent(instance: MeetupHome) {
    this.meetupComponentInstance = instance;
  }
}
