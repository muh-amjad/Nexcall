import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { UserSearchResultDto } from '../../dtos/user-search-result.dto';
import { UserDto } from '../../dtos/user.dto';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { SignalrService } from '../../services/signalr.service';
import { UserDirectoryService } from '../../services/user-directory.service';
import { UsersFacade } from '../../store/facades/users.facade';
import { CallFacade } from '../../store/facades/call.facade';

@Component({
  selector: 'app-meetup-home',
  standalone: true,
  templateUrl: './meetup-home.html',
  styleUrl: './meetup-home.css',
  imports: [CommonModule, ReactiveFormsModule],
})
export class MeetupHome implements OnInit, AfterViewInit, OnDestroy {
  private readonly usersFacade = inject(UsersFacade);
  private readonly callFacade = inject(CallFacade);
  private readonly signalRService = inject(SignalrService);
  private readonly authService = inject(AuthService);
  private readonly userDirectoryService = inject(UserDirectoryService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly searchForm: FormGroup = this.fb.group({
    query: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly allUsers = this.usersFacade.users;
  readonly isInCall = this.callFacade.isCallStarted;
  readonly currentUsername = computed(() => this.authService.currentUser()?.username ?? '');
  readonly currentEmail = computed(() => this.authService.currentUser()?.email ?? '');

  readonly currentRoomId = signal<string | null>(null);
  readonly currentUserConnectionId = signal('');

  readonly incomingCall = signal<{ inviteId: string; roomId: string; fromUserId: string; fromUsername: string } | null>(
    null,
  );
  readonly ringingMessage = signal('');
  readonly remoteVideos = signal<Array<{ userId: string; username: string; stream: MediaStream }>>([]);
  readonly searchResults = signal<UserSearchResultDto[]>([]);
  readonly searching = signal(false);
  readonly searchMessage = signal('Search by username or email to find someone and call if online.');

  readonly onlineUsers = computed(() => {
    const myConnectionId = this.currentUserConnectionId();
    return this.allUsers().filter((u) => u.id !== myConnectionId);
  });

  isCameraOn = true;
  isMicOn = true;

  localStream!: MediaStream;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();

  @ViewChild('pageShell', { static: true })
  pageShellRef!: ElementRef<HTMLElement>;

  @ViewChild('localVideo', { static: true })
  localVideoRef!: ElementRef<HTMLVideoElement>;

  async ngOnInit(): Promise<void> {
    await this.startLocalStream();
    this.bindSignalrCallbacks();
    this.signalRService.attachSignalRHandlers();
    await this.signalRService.connectAndJoin();
    this.currentUserConnectionId.set(this.signalRService.connectionId);
  }

  ngAfterViewInit(): void {
    const shell = this.pageShellRef.nativeElement;
    gsap.from(shell.querySelectorAll('.top-bar, .search-panel, .video-section, .users-section'), {
      opacity: 0,
      y: 22,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
    });
  }

  ngOnDestroy(): void {
    this.cleanupAllPeerConnections();
  }

  async searchUsers() {
    if (this.searchForm.invalid || this.searching()) {
      return;
    }

    const query = this.searchForm.getRawValue().query as string;
    this.searching.set(true);
    this.searchMessage.set('Searching users...');

    this.userDirectoryService.searchUsers(query).subscribe({
      next: (results) => {
        this.searching.set(false);
        this.searchResults.set(results);
        this.searchMessage.set(results.length ? `Found ${results.length} user(s).` : 'No users matched your search.');
      },
      error: () => {
        this.searching.set(false);
        this.searchResults.set([]);
        this.searchMessage.set('Search failed. Please try again.');
      },
    });
  }

  callSearchedUser(result: UserSearchResultDto) {
    if (!result.isOnline || !result.connectionId) {
      window.alert('This user is currently offline.');
      return;
    }

    this.callUser(new UserDto(result.username, result.connectionId, result.userId, result.email));
  }

  callUser(user: User) {
    this.ringingMessage.set(`Ringing ${user.username}...`);
    this.signalRService.startCall(user.id);
  }

  endCall() {
    this.signalRService.leaveCall();
    this.cleanupAllPeerConnections();
    this.currentRoomId.set(null);
    this.remoteVideos.set([]);
    this.ringingMessage.set('');
    this.incomingCall.set(null);
  }

  async logout() {
    this.endCall();
    await this.signalRService.disconnect();
    this.authService.logout();
  }

  goHome() {
    this.router.navigate(['/']);
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

  canCall(user: User): boolean {
    if (!this.currentUserConnectionId()) {
      return false;
    }

    if (user.id === this.currentUserConnectionId()) {
      return false;
    }

    return !user.isInCall;
  }

  userStatus(user: User): string {
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
        this.currentUserConnectionId.set(this.signalRService.connectionId);
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

  private async syncParticipants(users: User[]) {
    this.currentUserConnectionId.set(this.signalRService.connectionId);

    const remoteUsers = users.filter((u) => u.id !== this.currentUserConnectionId());
    const remoteIds = new Set(remoteUsers.map((u) => u.id));

    for (const user of remoteUsers) {
      let peer = this.peerConnections.get(user.id);
      if (!peer) {
        peer = this.createPeerConnection(user.id, user.username);
      }

      const shouldInitiate = this.currentUserConnectionId().localeCompare(user.id) > 0;
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
