import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
  currentUsername: string = '';
  isInCall = this.callFacade.isCallStarted;

  isCameraOn = true;
  isMicOn = true;
  // ----------------
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;
  targetUserId!: string;

  @ViewChild('localVideo', { static: false })
  localVideoRef!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideo', { static: false })
  remoteVideoRef!: ElementRef<HTMLVideoElement>;

  constructor() {
    this.joinForm = this.fb.group({
      username: ['', Validators.required],
    });
  }
  async ngOnInit(): Promise<void> {
    await this.startLocalStream();
    this.signalRService.attachSignalRHandlers();
    this.signalRService.setComponent(this);
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
    this.signalRService.callEnded();
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

  async setupPeerConnection() {
    if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
      this.peerConnection = this.createPeerConnection();

      console.log('[Peer] Connection created');

      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      this.peerConnection.ontrack = (event) => {
        this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.signalRService.offerIceCandidate(event.candidate);
        }
      };

      this.peerConnection.onconnectionstatechange = async () => {
        console.log('[Peer] State:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'failed') {
          await this.restartIce();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection.iceConnectionState;
        console.log('[Peer] ICE:', state);
        if (state === 'failed') {
          console.log('[Peer] ICE failed, restarting');
          this.restartIce();
        }
        if (state === 'closed') {
          console.log('[Peer] Closed');
        }
      };
    }

    this.signalRService.setPeerConnection(this.peerConnection);
  }

  async startCall(user: UserDto) {
    this.targetUserId = user.id;
    this.setupPeerConnection();
    this.signalRService.setPeerConnection(this.peerConnection);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log(`User to call: ${user.username}, Offer created:`, offer);
    this.signalRService.sendCallOffer({ to: user.id, offer: this.peerConnection.localDescription });
    console.log('[Call] Offer sent');
  }

  createPeerConnection(): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    return this.peerConnection;
  }

  cleanupPeerConnection() {
    if (!this.peerConnection) return;

    this.peerConnection.getSenders().forEach((sender) => {
      sender.track?.stop();
    });

    this.peerConnection.ontrack = null;
    this.peerConnection.onicecandidate = null;
    this.peerConnection.onconnectionstatechange = null;
    this.peerConnection.oniceconnectionstatechange = null;

    this.peerConnection.close();
    this.peerConnection = null as any;

    this.callFacade.updateCallState(false);

    console.log('[Peer] Cleaned up');
  }

  async restartIce() {
    if (!this.peerConnection) return;

    console.log('[Peer] Restarting ICE...');

    const offer = await this.peerConnection.createOffer({
      iceRestart: true,
    });

    await this.peerConnection.setLocalDescription(offer);

    await this.signalRService.sendRestartOffer(this.targetUserId, offer);
    console.log('[Peer] Restart offer sent');
  }
}
