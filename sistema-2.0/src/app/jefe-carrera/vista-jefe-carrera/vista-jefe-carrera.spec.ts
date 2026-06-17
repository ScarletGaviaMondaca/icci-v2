import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaJefeCarrera } from './vista-jefe-carrera';

describe('VistaJefeCarrera', () => {
  let component: VistaJefeCarrera;
  let fixture: ComponentFixture<VistaJefeCarrera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaJefeCarrera],
    }).compileComponents();

    fixture = TestBed.createComponent(VistaJefeCarrera);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
