import { Component, ElementRef, OnInit, ViewChild, signal, OnDestroy } from '@angular/core';
import { SignalrService } from '../../services/signalr.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '../../app-state/app-state';
import { getAllUsers } from '../../store/selectors/users.selectors';
import { filter, Subscription } from 'rxjs';
import { UserDto } from '../../dtos/user.dto';

@Component({
  selector: 'app-meetup-home',
  standalone: true,
  templateUrl: './meetup-home.html',
  styleUrl: './meetup-home.css',
  imports: [CommonModule, ReactiveFormsModule],
})
export class MeetupHome implements OnInit, OnDestroy {
  joinForm: FormGroup;

  allUsers = signal<UserDto[]>([]);
  currentUsername: string = '';

  isCameraOn = true;
  isMicOn = true;
  // ----------------
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;

  @ViewChild('localVideo', { static: false })
  localVideoRef!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideo', { static: false })
  remoteVideoRef!: ElementRef<HTMLVideoElement>;

  private subscriptions: Array<Subscription> = new Array<Subscription>();

  constructor(
    private signalRService: SignalrService,
    private fb: FormBuilder,
    private store: Store<AppState>,
  ) {
    this.joinForm = this.fb.group({
      username: ['', Validators.required],
    });
  }
  async ngOnInit(): Promise<void> {
    this.subscribeToUserslist();
    await this.startLocalStream();
    this.setupPeerConnection();
    this.signalRService.registerPeerConnection(this);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private subscribeToUserslist(): void {
    const subscription = this.store
      .select(getAllUsers)
      .pipe(filter((item) => item !== undefined))
      .subscribe((allUsers) => {
        this.allUsers.set(allUsers);
      });
    this.subscriptions.push(subscription);
  }

  get sortedUsers(): UserDto[] {
    const me = this.allUsers().filter((u) => u.username === this.currentUsername);
    const others = this.allUsers().filter((u) => u.username !== this.currentUsername);
    return [...me, ...others];
  }

  join() {
    if (this.joinForm.invalid) return;
    this.currentUsername = this.joinForm.value.username;
    this.joinForm.reset();

    this.signalRService.joinUser(this.currentUsername);
  }

  callUser(user: any) {
    console.log('Calling', user.username);
    this.startCall(user);
  }

  endCall() {
    console.log('Call Ended');
  }

  toggleCamera() {
    this.isCameraOn = !this.isCameraOn;
    this.localStream.getVideoTracks().forEach((track) => (track.enabled = this.isCameraOn));
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;
    this.localStream.getAudioTracks().forEach((track) => (track.enabled = this.isMicOn));
  }

  // =============================
  // LOCAL MEDIA
  // =============================

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

  setupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    console.log('[Peer] Connection created');

    // Add local tracks
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
      console.log('[Peer] Added local track:', track.kind);
    });

    // =============================
    // ONTRACK (REMOTE STREAM)
    // =============================

    this.peerConnection.ontrack = (event) => {
      console.log('[Peer] ontrack fired:', event.track.kind);
      this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalRService.offerIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[Peer] Connection state:', this.peerConnection.connectionState);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[Peer] ICE state:', this.peerConnection.iceConnectionState);
    };
  }

  ensurePeerConnection() {
    if (!this.peerConnection) {
      this.setupPeerConnection();
    }
  }

  async startCall(user: UserDto) {
    this.ensurePeerConnection();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log(`User to call: ${user.username}, Offer created:`, offer);
    this.signalRService.sendCallOffer({ to: user.id, offer: this.peerConnection.localDescription });
    console.log('[Call] Offer sent');
  }
}
