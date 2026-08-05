import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaSolicitud } from './vista-solicitud';

describe('VistaSolicitud', () => {
  let component: VistaSolicitud;
  let fixture: ComponentFixture<VistaSolicitud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaSolicitud],
    }).compileComponents();

    fixture = TestBed.createComponent(VistaSolicitud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
