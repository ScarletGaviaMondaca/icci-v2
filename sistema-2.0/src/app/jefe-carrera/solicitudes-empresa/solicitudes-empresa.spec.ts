import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudesEmpresa } from './solicitudes-empresa';

describe('SolicitudesEmpresa', () => {
  let component: SolicitudesEmpresa;
  let fixture: ComponentFixture<SolicitudesEmpresa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesEmpresa],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesEmpresa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
