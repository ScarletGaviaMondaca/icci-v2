import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlumnosAsociados } from './alumnos-asociados';

describe('AlumnosAsociados', () => {
  let component: AlumnosAsociados;
  let fixture: ComponentFixture<AlumnosAsociados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlumnosAsociados],
    }).compileComponents();

    fixture = TestBed.createComponent(AlumnosAsociados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
