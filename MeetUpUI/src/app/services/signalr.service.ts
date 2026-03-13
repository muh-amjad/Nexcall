import { inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { UsersFacade } from '../store/facades/users.facade';
import { CallOfferDto } from '../dtos/callofferDto';
import { CallFacade } from '../store/facades/call.facade';

type IncomingCallPayload = {
  inviteId: string;
  roomId: string;
  fromUserId: string;
  fromUsername: string;
};

type CallDeclinedPayload = {
  inviteId: string;
  roomId: string;
  declinedByUserId: string;
  declinedByUsername: string;
};

type CallAcceptedPayload = {
  inviteId: string;
  roomId: string;
  acceptedByUserId: string;
  acceptedByUsername: string;
  users: Array<{ id: string; username: string; isInCall: boolean; roomId?: string | null }>;
};

type RoomParticipantsPayload = {
  roomId: string;
  users: Array<{ id: string; username: string; isInCall: boolean; roomId?: string | null }>;
};

type CandidatePayload = {
  roomId: string;
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
};

type SignalRCallbacks = {
  onIncomingCall?: (payload: IncomingCallPayload) => void;
  onCallDeclined?: (payload: CallDeclinedPayload) => void;
  onCallAccepted?: (payload: CallAcceptedPayload) => void;
  onCallFailed?: (message: string) => void;
  onCallRinging?: (payload: { toUsername: string }) => void;
  onRoomParticipantsUpdated?: (payload: RoomParticipantsPayload) => void;
  onReceiveCallOffer?: (offer: CallOfferDto) => void;
  onReceiveCallAnswer?: (answer: CallOfferDto) => void;
  onReceiveCandidate?: (candidatePayload: CandidatePayload) => void;
};

@Injectable()
export class SignalrService {
  private userFacade = inject(UsersFacade);
  private callFacade = inject(CallFacade);
  private myConnectionID!: string;
  private hubConnection!: signalR.HubConnection;
  private callbacks: SignalRCallbacks = {};

  constructor() {
    this.createHubConnection();
    this.myConnectionID = '';
  }

  get connectionId(): string {
    return this.myConnectionID;
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

  joinUser(username: string) {
    this.hubConnection.invoke('JoinUser', username);
  }

  startCall(targetUserId: string) {
    this.hubConnection.invoke('StartCall', targetUserId);
  }

  respondToCall(inviteId: string, accepted: boolean) {
    this.hubConnection.invoke('RespondToCall', inviteId, accepted);
  }

  sendCallOffer(roomId: string, toUserId: string, offer: RTCSessionDescriptionInit) {
    this.hubConnection.invoke('SendCallOffer', new CallOfferDto(this.myConnectionID, toUserId, roomId, offer));
  }

  sendCallAnswer(roomId: string, toUserId: string, answer: RTCSessionDescriptionInit) {
    this.hubConnection.invoke('SendCallAnswer', new CallOfferDto(this.myConnectionID, toUserId, roomId, answer));
  }

  sendIceCandidate(roomId: string, toUserId: string, candidate: RTCIceCandidateInit) {
    this.hubConnection.invoke('SendCandidate', roomId, toUserId, candidate);
  }

  leaveCall() {
    this.hubConnection.invoke('LeaveCall');
    this.callFacade.updateCallState(false);
  }

  setCallbacks(callbacks: SignalRCallbacks) {
    this.callbacks = callbacks;
  }

  private userJoined() {
    this.hubConnection.on('UserJoined', (allUsers: Array<{ id: string; username: string; isInCall: boolean; roomId?: string | null }>) => {
      console.log('User joined from server: ', JSON.stringify(allUsers));
      this.userFacade.updateUserList(allUsers);
    });
  }

  private receiveIncomingCall() {
    this.hubConnection.on('ReceiveIncomingCall', (payload: IncomingCallPayload) => {
      this.callbacks.onIncomingCall?.(payload);
    });
  }

  private receiveCallDeclined() {
    this.hubConnection.on('CallDeclined', (payload: CallDeclinedPayload) => {
      this.callbacks.onCallDeclined?.(payload);
    });
  }

  private receiveCallAccepted() {
    this.hubConnection.on('CallAccepted', (payload: CallAcceptedPayload) => {
      this.callFacade.updateCallState(true);
      this.callbacks.onCallAccepted?.(payload);
    });
  }

  private receiveCallRinging() {
    this.hubConnection.on('CallRinging', (payload: { toUsername: string }) => {
      this.callbacks.onCallRinging?.(payload);
    });
  }

  private receiveCallFailed() {
    this.hubConnection.on('CallFailed', (message: string) => {
      this.callbacks.onCallFailed?.(message);
    });
  }

  private receiveParticipantsUpdated() {
    this.hubConnection.on('RoomParticipantsUpdated', (payload: RoomParticipantsPayload) => {
      this.callbacks.onRoomParticipantsUpdated?.(payload);
    });
  }

  private receiveCallOffer() {
    this.hubConnection.on('ReceiveCallOffer', (callOffer: CallOfferDto) => {
      this.callbacks.onReceiveCallOffer?.(callOffer);
    });
  }

  private receiveCallAnswer() {
    this.hubConnection.on('ReceiveCallAnswer', (callOffer: CallOfferDto) => {
      this.callbacks.onReceiveCallAnswer?.(callOffer);
    });
  }

  private receiveCandidate() {
    this.hubConnection.on('ReceiveCandidate', (payload: CandidatePayload) => {
      this.callbacks.onReceiveCandidate?.(payload);
    });
  }

  attachSignalRHandlers() {
    this.userJoined();
    this.receiveIncomingCall();
    this.receiveCallDeclined();
    this.receiveCallAccepted();
    this.receiveCallRinging();
    this.receiveCallFailed();
    this.receiveParticipantsUpdated();
    this.receiveCallOffer();
    this.receiveCallAnswer();
    this.receiveCandidate();
  }
}
