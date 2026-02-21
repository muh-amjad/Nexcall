import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SignalrService } from '../../services/signalr.service';

@Component({
  selector: 'app-meetup-home',
  standalone: true,
  templateUrl: './meetup-home.html',
  styleUrl: './meetup-home.css',
})
export class MeetupHome implements OnInit, AfterViewInit {
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;

  private remoteStream = new MediaStream();

  @ViewChild('localVideo', { static: false })
  localVideoRef!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideo', { static: false })
  remoteVideoRef!: ElementRef<HTMLVideoElement>;

  constructor(private signalRService: SignalrService) {}

  // =============================
  // LIFECYCLE
  // =============================

  async ngOnInit(): Promise<void> {
    await this.startLocalStream();
    this.setupPeerConnection();
    this.signalRService.registerPeerConnection(this);
  }

  ngAfterViewInit(): void {
    // Attach remote stream once
    this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;

    const remoteVideo = this.remoteVideoRef.nativeElement;

    // Attach remote stream
    remoteVideo.srcObject = this.remoteStream;

    // Play when metadata ready
    remoteVideo.onloadedmetadata = () => {
      console.log('Remote metadata loaded');
      remoteVideo.play().catch((err) => console.log('Play error:', err));
    };
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

    // this.peerConnection.ontrack = (event) => {
    //   console.log('[Peer] ontrack fired:', event.track.kind);

    //   // Add track only if not already added
    //   if (!this.remoteStream.getTracks().includes(event.track)) {
    //     this.remoteStream.addTrack(event.track);
    //   }

    //   // DO NOT call play() here
    //   // DO NOT reassign srcObject here
    // };

    this.peerConnection.ontrack = (event) => {
      console.log('Track received:', event.track.kind);
      console.log('Track readyState:', event.track.readyState);
      console.log('Track enabled:', event.track.enabled);

      if (!this.remoteStream.getTracks().includes(event.track)) {
        this.remoteStream.addTrack(event.track);
      }
    };

    // =============================
    // ICE
    // =============================

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalRService.sendMessage(
          JSON.stringify({ type: 'ice', candidate: event.candidate }),
        );
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

  async startCall() {
    this.ensurePeerConnection();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.signalRService.sendMessage(JSON.stringify({ type: 'offer', offer }));

    console.log('[Call] Offer sent');
  }
}
