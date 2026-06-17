import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosAcreditacion } from './datos-acreditacion';

describe('DatosAcreditacion', () => {
  let component: DatosAcreditacion;
  let fixture: ComponentFixture<DatosAcreditacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosAcreditacion],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosAcreditacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
