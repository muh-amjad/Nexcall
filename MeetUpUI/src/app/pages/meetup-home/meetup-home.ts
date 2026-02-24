import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, signal } from '@angular/core';
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
export class MeetupHome implements OnInit, AfterViewInit {
  joinForm: FormGroup;

  allUsers = signal<UserDto[]>([]);
  currentUsername: string = '';

  isCameraOn = true;
  isMicOn = true;
  // ----------------
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;

  private remoteStream = new MediaStream();

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
    // await this.startLocalStream();
    // this.setupPeerConnection();
    // this.signalRService.registerPeerConnection(this);
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
    // apna user top pe leke aao
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
  }

  endCall() {
    console.log('Call Ended');
  }

  toggleCamera() {
    this.isCameraOn = !this.isCameraOn;
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;
  }

  // =============================
  // LIFECYCLE
  // =============================

  ngAfterViewInit(): void {
    // Attach remote stream once
    // this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
    // const remoteVideo = this.remoteVideoRef.nativeElement;
    // // Attach remote stream
    // remoteVideo.srcObject = this.remoteStream;
    // // Play when metadata ready
    // remoteVideo.onloadedmetadata = () => {
    //   console.log('Remote metadata loaded');
    //   remoteVideo.play().catch((err) => console.log('Play error:', err));
    // };
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
      localVideo.muted = true; // Prevent echo
      await localVideo.play();

      console.log('[Local] Stream started');
    } catch (err) {
      console.error('Camera/Mic error:', err);
    }
  }

  // =============================
  // PEER CONNECTION
  // =============================

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

    // this.peerConnection.ontrack = (event) => {
    //   console.log('Track received:', event.track.kind);
    //   console.log('Track readyState:', event.track.readyState);
    //   console.log('Track enabled:', event.track.enabled);

    //   if (!this.remoteStream.getTracks().includes(event.track)) {
    //     this.remoteStream.addTrack(event.track);
    //   }
    // };

    // =============================
    // ICE
    // =============================

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // this.signalRService.offerCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[Peer] Connection state:', this.peerConnection.connectionState);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[Peer] ICE state:', this.peerConnection.iceConnectionState);
    };
  }

  // =============================
  // SIGNALR HELPERS
  // =============================

  ensurePeerConnection() {
    if (!this.peerConnection) {
      this.setupPeerConnection();
      const remoteVideo = this.remoteVideoRef.nativeElement;

      // remoteVideo.onloadedmetadata = () => {
      //   console.log('Remote metadata loaded');
      //   remoteVideo.play().catch((err) => console.log(err));
      // };
    }
  }

  // async startCall() {
  //   this.ensurePeerConnection();

  //   const offer = await this.peerConnection.createOffer();
  //   await this.peerConnection.setLocalDescription(offer);

  //   // this.signalRService.sendMessage(JSON.stringify({ type: 'offer', offer }));

  //   console.log('[Call] Offer sent');
  // }
}
