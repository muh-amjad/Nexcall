import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetupHome } from './meetup-home';

describe('MeetupHome', () => {
  let component: MeetupHome;
  let fixture: ComponentFixture<MeetupHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeetupHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeetupHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
