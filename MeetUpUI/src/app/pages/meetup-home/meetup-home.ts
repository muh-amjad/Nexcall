import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { SignalrService } from '../../services/signalr.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDto } from '../../dtos/user.dto';
import { UsersFacade } from '../../store/facades/users.facade';
import { CallFacade } from '../../store/facades/call.facade';

@Component({
  selector: 'app-meetup-home',
  standalone: true,
  templateUrl: './meetup-home.html',
  styleUrl: './meetup-home.css',
  imports: [CommonModule, ReactiveFormsModule],
})
export class MeetupHome implements OnInit {
  private usersFacade = inject(UsersFacade);
  private callFacade = inject(CallFacade);
  private signalRService = inject(SignalrService);
  private fb = inject(FormBuilder);

  joinForm: FormGroup;

  allUsers = this.usersFacade.users;
  currentUsername = signal('');
  isInCall = this.callFacade.isCallStarted;
  currentRoomId = signal<string | null>(null);
  currentUserId = signal('');
  incomingCall = signal<{ inviteId: string; roomId: string; fromUserId: string; fromUsername: string } | null>(
    null,
  );
  ringingMessage = signal('');
  remoteVideos = signal<Array<{ userId: string; username: string; stream: MediaStream }>>([]);
  sortedUsers = computed(() => {
    const username = this.currentUsername();
    const users = this.allUsers();
    const me = users.filter((u) => u.username === username);
    const others = users.filter((u) => u.username !== username);
    return [...me, ...others];
  });

  isCameraOn = true;
  isMicOn = true;

  localStream!: MediaStream;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();

  @ViewChild('localVideo', { static: true })
  localVideoRef!: ElementRef<HTMLVideoElement>;

  constructor() {
    this.joinForm = this.fb.group({
      username: ['', Validators.required],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.startLocalStream();
    this.bindSignalrCallbacks();
    this.signalRService.attachSignalRHandlers();
  }

  join() {
    if (this.joinForm.invalid) return;
    this.currentUsername.set(this.joinForm.value.username);
    this.currentUserId.set(this.signalRService.connectionId);
    this.joinForm.reset();

    this.signalRService.joinUser(this.currentUsername());
  }

  callUser(user: UserDto) {
    console.log('Calling', user.username);
    this.ringingMessage.set(`Ringing ${user.username}...`);
    this.signalRService.startCall(user.id);
  }

  endCall() {
    console.log('Call Ended');
    this.signalRService.leaveCall();
    this.cleanupAllPeerConnections();
    this.currentRoomId.set(null);
    this.remoteVideos.set([]);
    this.ringingMessage.set('');
    this.incomingCall.set(null);
  }

  toggleCamera() {
    this.isCameraOn = !this.isCameraOn;
    this.localStream.getVideoTracks().forEach((track) => (track.enabled = this.isCameraOn));
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;
    this.localStream.getAudioTracks().forEach((track) => (track.enabled = this.isMicOn));
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const localVideo = this.localVideoRef.nativeElement;
      localVideo.srcObject = this.localStream;
      await localVideo.play();

      console.log('[Local] Stream started');
    } catch (err) {
      console.error('Camera/Mic error:', err);
    }
  }

  canCall(user: UserDto): boolean {
    if (!this.currentUsername()) {
      return false;
    }

    if (user.username === this.currentUsername()) {
      return false;
    }

    return !user.isInCall;
  }

  userStatus(user: UserDto): string {
    return user.isInCall ? 'In a call' : 'Available';
  }

  acceptIncomingCall() {
    const incomingCall = this.incomingCall();
    if (!incomingCall) {
      return;
    }

    this.signalRService.respondToCall(incomingCall.inviteId, true);
    this.incomingCall.set(null);
  }

  rejectIncomingCall() {
    const incomingCall = this.incomingCall();
    if (!incomingCall) {
      return;
    }

    this.signalRService.respondToCall(incomingCall.inviteId, false);
    this.incomingCall.set(null);
  }

  private bindSignalrCallbacks() {
    this.signalRService.setCallbacks({
      onIncomingCall: (payload) => {
        this.incomingCall.set(payload);
      },
      onCallDeclined: (payload) => {
        this.ringingMessage.set('');
        window.alert(`${payload.declinedByUsername} declined the call.`);
      },
      onCallAccepted: (payload) => {
        this.ringingMessage.set('');
        this.currentRoomId.set(payload.roomId);
        this.currentUserId.set(this.signalRService.connectionId);
        void this.syncParticipants(payload.users);
      },
      onCallFailed: (message) => {
        this.ringingMessage.set('');
        window.alert(message);
      },
      onRoomParticipantsUpdated: (payload) => {
        if (this.currentRoomId() && this.currentRoomId() !== payload.roomId) {
          return;
        }

        this.currentRoomId.set(payload.roomId);
        void this.syncParticipants(payload.users);
      },
      onReceiveCallOffer: (offer) => {
        void this.handleOffer(offer);
      },
      onReceiveCallAnswer: (answer) => {
        void this.handleAnswer(answer);
      },
      onReceiveCandidate: (candidatePayload) => {
        void this.handleCandidate(candidatePayload);
      },
    });
  }

  private async syncParticipants(
    users: Array<{ id: string; username: string; isInCall: boolean; roomId?: string | null }>,
  ) {
    this.currentUserId.set(this.signalRService.connectionId);

    const remoteUsers = users.filter((u) => u.id !== this.currentUserId());
    const remoteIds = new Set(remoteUsers.map((u) => u.id));

    for (const user of remoteUsers) {
      let peer = this.peerConnections.get(user.id);
      if (!peer) {
        peer = this.createPeerConnection(user.id, user.username);
      }

      const shouldInitiate = this.currentUserId().localeCompare(user.id) > 0;
      if (shouldInitiate && peer.signalingState === 'stable') {
        await this.createOfferFor(user.id);
      }
    }

    for (const [remoteId] of this.peerConnections) {
      if (!remoteIds.has(remoteId)) {
        this.removeRemotePeer(remoteId);
      }
    }
  }

  private createPeerConnection(remoteUserId: string, remoteUsername: string): RTCPeerConnection {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.localStream.getTracks().forEach((track) => {
      connection.addTrack(track, this.localStream);
    });

    connection.ontrack = (event) => {
      const stream = event.streams[0];
      this.remoteStreams.set(remoteUserId, stream);
      this.updateRemoteVideos(remoteUserId, remoteUsername, stream);
    };

    connection.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId()) {
        this.signalRService.sendIceCandidate(this.currentRoomId()!, remoteUserId, event.candidate.toJSON());
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        this.removeRemotePeer(remoteUserId);
      }
    };

    this.peerConnections.set(remoteUserId, connection);
    return connection;
  }

  private async createOfferFor(remoteUserId: string) {
    const peer = this.peerConnections.get(remoteUserId);
    if (!peer || !this.currentRoomId()) {
      return;
    }

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    if (peer.localDescription) {
      this.signalRService.sendCallOffer(this.currentRoomId()!, remoteUserId, peer.localDescription);
    }
  }

  private async handleOffer(offer: {
    from: string;
    to: string;
    roomId: string;
    offer: RTCSessionDescriptionInit;
  }) {
    if (!this.currentRoomId()) {
      this.currentRoomId.set(offer.roomId);
    }

    let peer = this.peerConnections.get(offer.from);
    if (!peer) {
      const remoteUser = this.allUsers().find((u) => u.id === offer.from);
      peer = this.createPeerConnection(offer.from, remoteUser?.username ?? 'User');
    }

    if (peer.signalingState === 'have-local-offer') {
      await peer.setLocalDescription({ type: 'rollback' });
    }

    await peer.setRemoteDescription(new RTCSessionDescription(offer.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    if (peer.localDescription) {
      this.signalRService.sendCallAnswer(this.currentRoomId()!, offer.from, peer.localDescription);
    }
  }

  private async handleAnswer(answer: {
    from: string;
    to: string;
    roomId: string;
    offer: RTCSessionDescriptionInit;
  }) {
    const peer = this.peerConnections.get(answer.from);
    if (!peer) {
      return;
    }

    await peer.setRemoteDescription(new RTCSessionDescription(answer.offer));
  }

  private async handleCandidate(payload: {
    roomId: string;
    from: string;
    to: string;
    candidate: RTCIceCandidateInit;
  }) {
    const peer = this.peerConnections.get(payload.from);
    if (!peer) {
      return;
    }

    await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
  }

  private updateRemoteVideos(remoteUserId: string, remoteUsername: string, stream: MediaStream) {
    this.remoteVideos.update((videos) => {
      const current = videos.filter((video) => video.userId !== remoteUserId);
      return [...current, { userId: remoteUserId, username: remoteUsername, stream }];
    });
  }

  private removeRemotePeer(remoteUserId: string) {
    const connection = this.peerConnections.get(remoteUserId);
    if (connection) {
      connection.close();
    }

    this.peerConnections.delete(remoteUserId);
    this.remoteStreams.delete(remoteUserId);
    this.remoteVideos.update((videos) => videos.filter((video) => video.userId !== remoteUserId));

  }

  private cleanupAllPeerConnections() {
    for (const [remoteUserId] of this.peerConnections) {
      this.removeRemotePeer(remoteUserId);
    }

    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.remoteVideos.set([]);
    this.callFacade.updateCallState(false);
  }

  trackByRemoteId(_: number, item: { userId: string }): string {
    return item.userId;
  }
}
